import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RL } from "@/lib/rate-limit";
import { redis } from "@/lib/redis";
import { notifyPostCompleted } from "@/lib/notifications";
import { invalidate, CacheKey } from "@/lib/cache";
import { BadgeType } from "@prisma/client";

const SGR_VALUE_PER_BOTTLE = 0.5; // RON

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.write);
  if (!rl.ok) return rl.response;

  const { id } = await params;

  let body: { token?: string; actualBottleCount?: number } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (!body.token) {
    return NextResponse.json({ error: "Token QR lipsă" }, { status: 400 });
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, phone: true } },
        collector: { select: { id: true, name: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Anunț negăsit" }, { status: 404 });
    }

    if (post.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Anunțul nu este activ" },
        { status: 409 },
      );
    }

    // Only the collector can complete via QR scan
    if (post.collectorId !== session.user.id) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    // Validate QR token
    const storedToken = await redis.get(`qr:${id}`);
    if (!storedToken || storedToken !== body.token) {
      return NextResponse.json(
        { error: "Token QR invalid sau expirat" },
        { status: 400 },
      );
    }

    // Check 30-min deadline
    if (post.expiresAt && post.expiresAt < new Date()) {
      await prisma.post.update({ where: { id }, data: { status: "EXPIRED" } });
      await redis.del(`qr:${id}`);
      return NextResponse.json(
        { error: "Fereastra de colectare a expirat" },
        { status: 410 },
      );
    }
    if (body.actualBottleCount !== undefined) {
      if (
        !Number.isInteger(body.actualBottleCount) ||
        body.actualBottleCount < 1 ||
        body.actualBottleCount > 10_000
      ) {
        return NextResponse.json({ error: "Număr invalid" }, { status: 400 });
      }
    }
    // Use actual count if provided, otherwise use post's bottleCount
    const finalBottleCount = body.actualBottleCount ?? post.bottleCount;
    const actualValue = finalBottleCount * SGR_VALUE_PER_BOTTLE;
    const collectorEarning = (actualValue * post.collectorSharePercent) / 100;
    const posterEarning = actualValue - collectorEarning;

    // Complete within a transaction
    await prisma.$transaction(async (tx) => {
      // Mark post completed
      await tx.post.update({
        where: { id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          postId: id,
          posterId: post.authorId,
          collectorId: post.collectorId!,
          bottleCount: finalBottleCount,
          actualValue,
          collectorEarning,
          posterEarning,
        },
      });

      // Update poster stats
      await tx.user.update({
        where: { id: post.authorId },
        data: {
          totalBottlesGiven: { increment: finalBottleCount },
          totalTransactions: { increment: 1 },
          totalSaved: { increment: posterEarning },
        },
      });

      // Update collector stats
      await tx.user.update({
        where: { id: post.collectorId! },
        data: {
          totalBottlesCollected: { increment: finalBottleCount },
          totalTransactions: { increment: 1 },
          totalEarned: { increment: collectorEarning },
        },
      });
    });

    // Clean up QR token
    await redis.del(`qr:${id}`);

    // Award badges async
    awardBadges(post.authorId, post.collectorId!).catch(console.error);

    // Notify both parties
    await Promise.all([
      notifyPostCompleted(post.authorId, id, posterEarning, "poster"),
      notifyPostCompleted(post.collectorId!, id, collectorEarning, "collector"),
    ]);

    // Invalidate caches
    await Promise.all([
      invalidate(CacheKey.profile(post.authorId)),
      invalidate(CacheKey.profile(post.collectorId!)),
    ]);

    return NextResponse.json({
      success: true,
      transaction: {
        actualValue,
        collectorEarning,
        posterEarning,
        bottleCount: finalBottleCount,
      },
    });
  } catch (err) {
    console.error("[POST /api/v1/posts/[id]/complete]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}

// ─── Badge Awards ─────────────────────────────────────────────────────────────

async function awardBadges(posterId: string, collectorId: string) {
  const [poster, collector] = await Promise.all([
    prisma.user.findUnique({
      where: { id: posterId },
      select: { totalTransactions: true, _count: { select: { posts: true } } },
    }),
    prisma.user.findUnique({
      where: { id: collectorId },
      select: {
        totalTransactions: true,
        _count: { select: { claimedPosts: true } },
      },
    }),
  ]);

  const posterBadges: BadgeType[] = [];
  if (poster) {
    if (poster._count.posts === 1) posterBadges.push("FIRST_POST");
    if (poster._count.posts >= 10) posterBadges.push("POST_VETERAN_10");
    if (poster._count.posts >= 50)
      posterBadges.push("POST_VETERAN_50" as const);
    if (poster._count.posts >= 100)
      posterBadges.push("POST_VETERAN_100" as const);
    if (poster.totalTransactions >= 100)
      posterBadges.push("CENTURION" as const);
  }

  const collectorBadges: BadgeType[] = [];
  if (collector) {
    if (collector._count.claimedPosts === 1)
      collectorBadges.push("FIRST_COLLECTION" as const);
    if (collector._count.claimedPosts >= 10)
      collectorBadges.push("COLLECTOR_STARTER_10" as const);
    if (collector._count.claimedPosts >= 50)
      collectorBadges.push("COLLECTOR_PRO_50" as const);
    if (collector._count.claimedPosts >= 100)
      collectorBadges.push("COLLECTOR_ELITE_100" as const);
    if (collector.totalTransactions >= 100)
      collectorBadges.push("CENTURION" as const);
  }

  // Award badges (ignore duplicates via @@unique constraint)
  await Promise.allSettled([
    ...posterBadges.map((type) =>
      prisma.badge
        .create({ data: { userId: posterId, type } })
        .catch(() => null),
    ),
    ...collectorBadges.map((type) =>
      prisma.badge
        .create({ data: { userId: collectorId, type } })
        .catch(() => null),
    ),
  ]);

  // Check eco badges based on total bottles
  await awardEcoBadges(posterId, collectorId);
}

async function awardEcoBadges(posterId: string, collectorId: string) {
  const [poster, collector] = await Promise.all([
    prisma.user.findUnique({
      where: { id: posterId },
      select: { totalBottlesGiven: true },
    }),
    prisma.user.findUnique({
      where: { id: collectorId },
      select: { totalBottlesCollected: true },
    }),
  ]);

  const posterBottles = poster?.totalBottlesGiven ?? 0;
  const collectorBottles = collector?.totalBottlesCollected ?? 0;

  const ecoBadgesFor = async (userId: string, bottles: number) => {
    const badges: BadgeType[] = [];
    if (bottles >= 50) badges.push("ECO_STARTER" as const);
    if (bottles >= 250) badges.push("ECO_WARRIOR" as const);
    if (bottles >= 1000) badges.push("ECO_CHAMPION" as const);
    if (bottles >= 5000) badges.push("ECO_LEGEND" as const);
    await Promise.allSettled(
      badges.map((type) =>
        prisma.badge.create({ data: { userId, type } }).catch(() => null),
      ),
    );
  };

  await Promise.all([
    ecoBadgesFor(posterId, posterBottles),
    ecoBadgesFor(collectorId, collectorBottles),
  ]);
}
