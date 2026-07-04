import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RL } from "@/lib/rate-limit";
import { isValidObjectId } from "@/lib/validate";
import {
  notifyPostCancelled,
  notifyInProgressCancelled,
  createNotification,
} from "@/lib/notifications";
import { invalidate, CacheKey } from "@/lib/cache";
import { redis } from "@/lib/redis";
import { publishPostCancelled, publishPostStatus } from "@/lib/pubsub";

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

  try {
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return NextResponse.json({ error: "Anunț negăsit" }, { status: 404 });
    }

    const isAuthor = post.authorId === session.user.id;
    const isCollector = post.collectorId === session.user.id;

    if (!isAuthor && !isCollector) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    const cancelableStatuses = ["OPEN", "CLAIMED", "IN_PROGRESS"] as const;
    if (
      !cancelableStatuses.includes(
        post.status as (typeof cancelableStatuses)[number],
      )
    ) {
      return NextResponse.json(
        { error: "Anunțul nu poate fi anulat în această stare" },
        { status: 409 },
      );
    }

    if (post.status === "OPEN") {
      if (!isAuthor) {
        return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
      }
      try {
        await prisma.post.update({
          where: { id, status: "OPEN" },
          data: { status: "CANCELLED" },
        });
      } catch (e) {
        if ((e as { code?: string }).code === "P2025") {
          return NextResponse.json(
            { error: "Anunțul nu se mai află în starea așteptată." },
            { status: 409 },
          );
        }
        throw e;
      }

      publishPostStatus({ postId: id, status: "CANCELLED" }, [post.authorId]);
      publishPostCancelled(id, [post.authorId], {
        postId: id,
        cancelledBy: "poster",
        newStatus: "CANCELLED",
      });

      return NextResponse.json({ success: true, status: "CANCELLED" });
    }

    if (post.status === "CLAIMED") {
      if (isAuthor) {
        try {
          await prisma.post.update({
            where: { id, status: "CLAIMED", collectorId: post.collectorId },
            data: { status: "CANCELLED" },
          });
        } catch (e) {
          if ((e as { code?: string }).code === "P2025") {
            return NextResponse.json(
              { error: "Cererea nu mai este validă." },
              { status: 409 },
            );
          }
          throw e;
        }
        if (post.collectorId) {
          await notifyPostCancelled(post.collectorId, id, "poster");
        }
        publishPostStatus(
          { postId: id, status: "CANCELLED", collectorId: null },
          [post.collectorId!],
        );
        publishPostCancelled(
          id,
          [post.authorId, ...(post.collectorId ? [post.collectorId] : [])],
          { postId: id, cancelledBy: "poster", newStatus: "CANCELLED" },
        );
        return NextResponse.json({ success: true, status: "CANCELLED" });
      } else {
        try {
          await prisma.post.update({
            where: { id, status: "CLAIMED", collectorId: post.collectorId },
            data: { status: "OPEN", collectorId: null, claimedAt: null },
          });
        } catch (e) {
          if ((e as { code?: string }).code === "P2025") {
            return NextResponse.json(
              { error: "Cererea nu mai este validă." },
              { status: 409 },
            );
          }
          throw e;
        }
        publishPostStatus({ postId: id, status: "OPEN", collectorId: null }, [
          post.authorId,
        ]);
        publishPostCancelled(
          id,
          [post.authorId, ...(post.collectorId ? [post.collectorId] : [])],
          { postId: id, cancelledBy: "collector", newStatus: "OPEN" },
        );
        return NextResponse.json({ success: true, status: "OPEN" });
      }
    }

    if (post.status === "IN_PROGRESS") {
      const cancellerUserId = isAuthor ? post.authorId : post.collectorId!;

      const canceller = await prisma.user.findUnique({
        where: { id: cancellerUserId },
        select: { reputationScore: true, ratingCount: true },
      });
      const currentScore = canceller?.reputationScore ?? 0;
      const currentCount = canceller?.ratingCount ?? 0;
      const newCount = currentCount + 1;
      const newScore =
        Math.round(((currentScore * currentCount) / newCount) * 100) / 100;

      try {
        await prisma.$transaction([
          prisma.post.update({
            where: {
              id,
              status: "IN_PROGRESS",
              collectorId: post.collectorId!,
            },
            data: isCollector
              ? {
                  status: "OPEN",
                  collectorId: null,
                  claimedAt: null,
                  expiresAt: post.expiresAt,
                }
              : { status: "CANCELLED" },
          }),
          prisma.user.update({
            where: { id: cancellerUserId },
            data: {
              cancelledCount: { increment: 1 },
              reputationScore: newScore,
              ratingCount: newCount,
            },
          }),
        ]);
      } catch (e) {
        if ((e as { code?: string }).code === "P2025") {
          return NextResponse.json(
            {
              error:
                "Colectarea a fost deja finalizată — nu mai poate fi anulată.",
            },
            { status: 409 },
          );
        }
        throw e;
      }

      await redis.del(`code:${id}`).catch(() => null);

      await invalidate(
        CacheKey.profile(cancellerUserId),
        `profile:${cancellerUserId}:summary`,
        CacheKey.posts(post.authorId, "active"),
        CacheKey.posts(post.authorId, "all"),
      );
      await createNotification({
        userId: cancellerUserId,
        type: "POST_CANCELLED",
        title: "Reputație afectată ⚠️",
        message: `Ai anulat o colectare în desfășurare. Scorul tău de reputație a fost redus la ${newScore.toFixed(1)}/5.`,
        link: "/profil",
      });

      const cancelledBy = isAuthor ? "poster" : "collector";
      const affectedUsers = [
        post.authorId,
        ...(post.collectorId ? [post.collectorId] : []),
      ];

      const cancellerUser = await prisma.user.findUnique({
        where: { id: cancellerUserId },
        select: { name: true },
      });
      const cancellerName = cancellerUser?.name ?? "Partenerul";

      if (isAuthor && post.collectorId) {
        publishPostStatus({ postId: id, status: "CANCELLED" }, [
          post.collectorId!,
        ]);
        await notifyInProgressCancelled(
          post.collectorId,
          id,
          cancellerName,
          "poster",
          newScore,
        );
      } else if (isCollector) {
        publishPostStatus({ postId: id, status: "OPEN", collectorId: null }, [
          post.authorId,
        ]);
        await notifyInProgressCancelled(
          post.authorId,
          id,
          cancellerName,
          "collector",
          newScore,
        );
      }

      publishPostCancelled(id, affectedUsers, {
        postId: id,
        cancelledBy,
        newStatus: isCollector ? "OPEN" : "CANCELLED",
      });

      return NextResponse.json({
        success: true,
        status: "CANCELLED",
        cancelledBy,
      });
    }

    return NextResponse.json({ error: "Stare necunoscută" }, { status: 400 });
  } catch (err) {
    console.error("[POST /api/v1/posts/[id]/cancel]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
