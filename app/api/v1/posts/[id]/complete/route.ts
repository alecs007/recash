import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RL } from "@/lib/rate-limit";
import { redis } from "@/lib/redis";
import { notifyPostCompleted } from "@/lib/notifications";
import { invalidate, CacheKey } from "@/lib/cache";
import { checkTransactionBadges } from "@/lib/badges";

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

    // Award badges via the single centralized path — never block the response.
    // Pass claimedAt so SPEED_DEMON can be evaluated.
    checkTransactionBadges(
      post.authorId,
      post.collectorId!,
      post.claimedAt,
    ).catch((err) => console.error("[complete] badge check error:", err));

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
