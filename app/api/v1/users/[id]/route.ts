import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { rateLimit, RL, getClientIp } from "@/lib/rate-limit";
import { isValidObjectId } from "@/lib/validate";

const PUBLIC_PROFILE_TTL = 60;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await rateLimit(`ip:user-profile:${getClientIp(req)}`, RL.public);
  if (!rl.ok) return rl.response;

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "ID invalid" }, { status: 400 });
  }

  const cacheKey = `public:user:${id}`;

  try {
    try {
      const raw = await redis.get(cacheKey);
      if (raw) {
        return NextResponse.json(JSON.parse(raw), {
          headers: { "X-Cache": "HIT" },
        });
      }
    } catch {
      // Non-fatal cache miss
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        image: true,
        certified: true,
        createdAt: true,
        totalBottlesGiven: true,
        totalBottlesCollected: true,
        totalTransactions: true,
        totalEarned: true,
        totalSaved: true,
        reputationScore: true,
        ratingCount: true,
        cancelledCount: true,
        _count: {
          select: { posts: true, claimedPosts: true, badges: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilizator negăsit" },
        { status: 404 },
      );
    }

    const badges = await prisma.badge.findMany({
      where: { userId: id },
      orderBy: { earnedAt: "desc" },
      select: { id: true, type: true, earnedAt: true },
    });

    const rawTransactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { posterId: id, collectorRating: { not: null } },
          { collectorId: id, posterRating: { not: null } },
        ],
      },
      orderBy: { completedAt: "desc" },
      take: 30,
      select: {
        id: true,
        bottleCount: true,
        actualValue: true,
        collectorEarning: true,
        posterEarning: true,
        collectorRating: true,
        posterRating: true,
        collectorReview: true,
        posterReview: true,
        completedAt: true,
        posterId: true,
        collectorId: true,
        postId: true,
        poster: {
          select: { id: true, name: true, image: true, certified: true },
        },
        collector: {
          select: { id: true, name: true, image: true, certified: true },
        },
      },
    });

    const postIds = [...new Set(rawTransactions.map((t) => t.postId))];
    const existingPosts = await prisma.post.findMany({
      where: { id: { in: postIds } },
      select: { id: true, locationName: true },
    });
    const postMap = new Map(existingPosts.map((p) => [p.id, p]));

    const reviews = rawTransactions
      .filter((t) => postMap.has(t.postId))
      .map((t) => {
        const isThisUserPoster = t.posterId === id;
        const ratingReceived = isThisUserPoster
          ? t.collectorRating
          : t.posterRating;
        const reviewReceived = isThisUserPoster
          ? t.collectorReview
          : t.posterReview;
        const reviewer = isThisUserPoster ? t.collector : t.poster;

        if (ratingReceived === null) return null;

        return {
          id: t.id,
          rating: ratingReceived,
          review: reviewReceived,
          reviewer: {
            id: reviewer?.id,
            name: reviewer?.name,
            image: reviewer?.image,
            certified: reviewer?.certified,
          },
          role: isThisUserPoster ? "poster" : "collector",
          bottleCount: t.bottleCount,
          locationName: postMap.get(t.postId)?.locationName ?? null,
          completedAt: t.completedAt,
        };
      })
      .filter(Boolean);

    const payload = {
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
        certified: user.certified,
        createdAt: user.createdAt,
        totalBottlesGiven: user.totalBottlesGiven,
        totalBottlesCollected: user.totalBottlesCollected,
        totalTransactions: user.totalTransactions,
        totalEarned: user.totalEarned,
        totalSaved: user.totalSaved,
        reputationScore: user.reputationScore,
        ratingCount: user.ratingCount,
        cancelledCount: user.cancelledCount,
        _count: user._count,
      },
      badges,
      reviews,
    };

    try {
      await redis.set(
        cacheKey,
        JSON.stringify(payload),
        "EX",
        PUBLIC_PROFILE_TTL,
      );
    } catch {
      // Non-fatal
    }

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("[GET /api/v1/users/[id]]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
