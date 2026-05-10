import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RL } from "@/lib/rate-limit";
import { cancelSchema } from "@/lib/validations/post";
import { notifyPostCancelled } from "@/lib/notifications";
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = cancelSchema.safeParse(body);
  const reason = parsed.success ? parsed.data.reason : null;

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
      await prisma.post.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

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
        await prisma.post.update({
          where: { id },
          data: { status: "OPEN", collectorId: null, claimedAt: null },
        });
        if (post.collectorId) {
          await notifyPostCancelled(post.collectorId, id, "poster");
        }
        publishPostStatus({ postId: id, status: "OPEN", collectorId: null }, [
          post.collectorId!,
        ]);
        publishPostCancelled(
          id,
          [post.authorId, ...(post.collectorId ? [post.collectorId] : [])],
          { postId: id, cancelledBy: "poster", newStatus: "OPEN" },
        );
        return NextResponse.json({ success: true, status: "OPEN" });
      } else {
        await prisma.post.update({
          where: { id },
          data: { status: "OPEN", collectorId: null, claimedAt: null },
        });
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
      await prisma.post.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      await redis.del(`code:${id}`).catch(() => null);

      const cancelledBy = isAuthor ? "poster" : "collector";
      const affectedUsers = [
        post.authorId,
        ...(post.collectorId ? [post.collectorId] : []),
      ];

      if (isAuthor && post.collectorId) {
        publishPostStatus({ postId: id, status: "CANCELLED" }, [
          post.collectorId!,
        ]);
        await notifyPostCancelled(post.collectorId, id, "poster");
      } else if (isCollector) {
        publishPostStatus({ postId: id, status: "CANCELLED" }, [post.authorId]);
        await notifyPostCancelled(post.authorId, id, "collector");
      }

      publishPostCancelled(id, affectedUsers, {
        postId: id,
        cancelledBy,
        newStatus: "CANCELLED",
      });

      return NextResponse.json({
        success: true,
        status: "CANCELLED",
        cancelledBy,
        reason,
      });
    }

    return NextResponse.json({ error: "Stare necunoscută" }, { status: 400 });
  } catch (err) {
    console.error("[POST /api/v1/posts/[id]/cancel]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
