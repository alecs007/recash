import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RL } from "@/lib/rate-limit";
import { isValidObjectId } from "@/lib/validate";
import { redis } from "@/lib/redis";
import { notifyPostCompleted } from "@/lib/notifications";
import { invalidate, CacheKey } from "@/lib/cache";
import { checkPostBadges, checkTransactionBadges } from "@/lib/badges";
import { publishPostCompleted, publishPostStatus } from "@/lib/pubsub";
import { computeEarnings } from "@/lib/earnings";

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

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Anunț negăsit" }, { status: 404 });
  }

  let body: { code?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (!body.code?.trim()) {
    return NextResponse.json(
      { error: "Cod de confirmare lipsă" },
      { status: 400 },
    );
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
    if (post.collectorId !== session.user.id) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const storedCode = await redis.get(`code:${id}`);
    if (
      !storedCode ||
      storedCode.toUpperCase() !== body.code.trim().toUpperCase()
    ) {
      return NextResponse.json(
        { error: "Cod invalid sau expirat" },
        { status: 400 },
      );
    }

    if (post.expiresAt && post.expiresAt < new Date()) {
      await prisma.post.update({ where: { id }, data: { status: "EXPIRED" } });
      await redis.del(`code:${id}`);
      return NextResponse.json(
        { error: "Fereastra de colectare a expirat" },
        { status: 410 },
      );
    }

    const bottleCount = post.bottleCount;
    const { actualValue, collectorEarning, posterEarning } = computeEarnings(
      bottleCount,
      post.collectorSharePercent,
    );

    try {
      await prisma.$transaction(async (tx) => {
        await tx.post.update({
          where: { id, status: "IN_PROGRESS", collectorId: post.collectorId! },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
        await tx.transaction.create({
          data: {
            postId: id,
            posterId: post.authorId,
            collectorId: post.collectorId!,
            bottleCount,
            actualValue,
            collectorEarning,
            posterEarning,
          },
        });
        await tx.user.update({
          where: { id: post.authorId },
          data: {
            totalBottlesGiven: { increment: bottleCount },
            totalTransactions: { increment: 1 },
            totalSaved: { increment: posterEarning },
          },
        });
        await tx.user.update({
          where: { id: post.collectorId! },
          data: {
            totalBottlesCollected: { increment: bottleCount },
            totalTransactions: { increment: 1 },
            totalEarned: { increment: collectorEarning },
          },
        });
      });
    } catch (e) {
      if ((e as { code?: string }).code === "P2025") {
        return NextResponse.json(
          {
            error: "Colectarea nu mai este activă - a fost anulată între timp.",
          },
          { status: 409 },
        );
      }
      throw e;
    }

    await redis.del(`code:${id}`);

    await Promise.all([
      checkPostBadges(post.authorId),
      checkTransactionBadges(post.authorId, post.collectorId!, post.claimedAt),
    ]).catch(console.error);

    await Promise.all([
      notifyPostCompleted(post.authorId, id, posterEarning, "poster"),
      notifyPostCompleted(post.collectorId!, id, collectorEarning, "collector"),
    ]);

    publishPostStatus({ postId: id, status: "COMPLETED" }, [
      post.authorId,
      post.collectorId!,
    ]);
    publishPostCompleted(id, post.authorId, post.collectorId!, {
      postId: id,
      actualValue,
      collectorEarning,
      posterEarning,
      bottleCount,
    });

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
        bottleCount,
      },
    });
  } catch (err) {
    console.error("[POST /api/v1/posts/[id]/complete]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
