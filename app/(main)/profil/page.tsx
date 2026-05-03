import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfilePage } from "./ProfilePage";
import { redis } from "@/lib/redis";

const SUMMARY_TTL = 30;

async function getProfileSummary(userId: string) {
  const cacheKey = `profile:${userId}:summary`;

  const cached_val = await (async () => {
    try {
      const raw = await redis.get(cacheKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  })();

  if (cached_val) return cached_val;

  const [user, postsResult, transactionsResult, badges] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        bio: true,
        phone: true,
        createdAt: true,
        totalBottlesGiven: true,
        totalBottlesCollected: true,
        totalTransactions: true,
        totalEarned: true,
        totalSaved: true,
        reputationScore: true,
        ratingCount: true,
        _count: {
          select: { posts: true, claimedPosts: true, badges: true },
        },
      },
    }),

    prisma.post.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        status: true,
        description: true,
        bottleCount: true,
        estimatedValue: true,
        collectorSharePercent: true,
        locationName: true,
        createdAt: true,
        collector: { select: { id: true, name: true, image: true } },
        transaction: {
          select: { actualValue: true, posterEarning: true },
        },
      },
    }),

    prisma.transaction.findMany({
      where: {
        OR: [{ posterId: userId }, { collectorId: userId }],
      },
      orderBy: { completedAt: "desc" },
      take: 3,
      select: {
        id: true,
        bottleCount: true,
        actualValue: true,
        collectorEarning: true,
        posterEarning: true,
        collectorRating: true,
        posterRating: true,
        completedAt: true,
        posterId: true,
        post: {
          select: { id: true, description: true, locationName: true },
        },
        poster: { select: { id: true, name: true, image: true } },
        collector: { select: { id: true, name: true, image: true } },
      },
    }),

    prisma.badge.findMany({
      where: { userId },
      orderBy: { earnedAt: "desc" },
      select: { id: true, type: true, earnedAt: true, seen: true },
    }),
  ]);

  if (!user) return null;

  const totalPosts = await prisma.post.count({ where: { authorId: userId } });
  const totalTransactions = await prisma.transaction.count({
    where: { OR: [{ posterId: userId }, { collectorId: userId }] },
  });

  const summary = {
    user,
    posts: postsResult,
    totalPosts,
    transactions: transactionsResult,
    totalTransactions,
    badges,
    hasUnseenBadges: badges.some((b) => !b.seen),
  };

  try {
    await redis.set(cacheKey, JSON.stringify(summary), "EX", SUMMARY_TTL);
  } catch {}

  return summary;
}

export default async function UserProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const summary = await getProfileSummary(session.user.id);
  if (!summary) redirect("/");

  return <ProfilePage summary={summary} />;
}
