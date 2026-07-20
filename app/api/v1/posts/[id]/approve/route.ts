import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RL } from "@/lib/rate-limit";
import { isValidObjectId } from "@/lib/validate";
import { approveClaimSchema } from "@/lib/validations/post";
import { notifyClaimApproved, notifyClaimDenied } from "@/lib/notifications";
import { redis } from "@/lib/redis";
import { publishPostStatus, publishToUser } from "@/lib/pubsub";
import { resolvePendingRequests } from "@/lib/claim-requests";
import { invalidate, CacheKey } from "@/lib/cache";
import {
  maybeEmailClaimApproved,
  maybeEmailClaimDenied,
} from "@/lib/email-optin";

const COLLECTION_WINDOW_MINUTES = 60;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  return Array.from(
    { length: 4 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join("");
}

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
  }

  const parsed = approveClaimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Acțiune invalidă" }, { status: 400 });
  }

  const { action, collectorId } = parsed.data;

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: { author: { select: { name: true } } },
    });

    if (!post) {
      return NextResponse.json({ error: "Anunț negăsit" }, { status: 404 });
    }
    if (post.authorId !== session.user.id) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }
    if (post.status !== "CLAIMED") {
      return NextResponse.json(
        { error: "Anunțul nu este în starea corectă" },
        { status: 409 },
      );
    }
    if (collectorId === post.authorId) {
      return NextResponse.json({ error: "Acțiune invalidă" }, { status: 400 });
    }

    const request = await prisma.claimRequest.findUnique({
      where: { postId_collectorId: { postId: id, collectorId } },
      include: { collector: { select: { name: true } } },
    });
    if (!request || request.status !== "PENDING") {
      return NextResponse.json(
        { error: "Cererea nu mai este validă — a fost retrasă între timp." },
        { status: 409 },
      );
    }

    const posterName = post.author.name ?? "Autorul";

    if (action === "approve") {
      if (post.expiresAt && post.expiresAt < new Date()) {
        await prisma.post.updateMany({
          where: { id, status: "CLAIMED" },
          data: { status: "EXPIRED", claimedAt: null },
        });
        await resolvePendingRequests(id, "post_expired");
        return NextResponse.json(
          { error: "Anunțul a expirat. Nu mai poate fi aprobat." },
          { status: 410 },
        );
      }

      const busy = await prisma.post.findFirst({
        where: { collectorId, status: "IN_PROGRESS" },
        select: { id: true },
      });
      if (busy) {
        return NextResponse.json(
          {
            error:
              "Acest colector are deja o colectare în desfășurare. Alege alt colector.",
          },
          { status: 409 },
        );
      }

      const collectionDeadline = new Date(
        Date.now() + COLLECTION_WINDOW_MINUTES * 60 * 1000,
      );
      const code = generateCode();
      const ttlSeconds = COLLECTION_WINDOW_MINUTES * 60 + 300;

      try {
        await prisma.$transaction([
          prisma.claimRequest.update({
            where: {
              postId_collectorId: { postId: id, collectorId },
              status: "PENDING",
            },
            data: { status: "ACCEPTED" },
          }),
          // status-only filter: Prisma's `collectorId: null` misses a missing
          // field (MongoDB); CLAIMED already implies no bound collector.
          prisma.post.update({
            where: { id, status: "CLAIMED" },
            data: {
              status: "IN_PROGRESS",
              collectorId,
              claimedAt: request.createdAt,
              expiresAt: collectionDeadline,
              listingExpiresAt: post.expiresAt,
            },
          }),
        ]);
      } catch (e) {
        if ((e as { code?: string }).code === "P2025") {
          return NextResponse.json(
            {
              error: "Cererea nu mai este validă — a fost anulată între timp.",
            },
            { status: 409 },
          );
        }
        throw e;
      }

      await resolvePendingRequests(id, "another_collector_chosen", collectorId);

      await redis.set(`code:${id}`, code, "EX", ttlSeconds);

      await notifyClaimApproved(collectorId, id, posterName);

      publishPostStatus(
        {
          postId: id,
          status: "IN_PROGRESS",
          collectorId,
          expiresAt: collectionDeadline.toISOString(),
        },
        [session.user.id, collectorId],
      );

      await invalidate(
        CacheKey.posts(post.authorId, "active"),
        CacheKey.posts(post.authorId, "all"),
      );

      maybeEmailClaimApproved({
        collectorId,
        posterName,
        bottleCount: post.bottleCount,
        postId: id,
      }).catch(console.error);

      return NextResponse.json({
        success: true,
        status: "IN_PROGRESS",
        deadline: collectionDeadline.toISOString(),
      });
    } else {
      try {
        await prisma.claimRequest.update({
          where: {
            postId_collectorId: { postId: id, collectorId },
            status: "PENDING",
          },
          data: { status: "DECLINED" },
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

      let newStatus: "OPEN" | "CLAIMED" = "CLAIMED";
      const remaining = await prisma.claimRequest.count({
        where: { postId: id, status: "PENDING" },
      });
      if (remaining === 0) {
        await prisma.post.updateMany({
          where: { id, status: "CLAIMED" },
          data: { status: "OPEN", claimedAt: null, collectorId: null },
        });
        newStatus = "OPEN";
      }

      await notifyClaimDenied(collectorId, id, posterName);

      publishPostStatus(
        { postId: id, status: newStatus, pendingRequestCount: remaining },
        [session.user.id],
      );

      publishToUser(collectorId, {
        type: "post:cancelled",
        payload: {
          postId: id,
          cancelledBy: "poster",
          newStatus,
          reason: "claim_denied",
        },
      });

      await invalidate(
        CacheKey.posts(post.authorId, "active"),
        CacheKey.posts(post.authorId, "all"),
      );

      maybeEmailClaimDenied({
        collectorId,
        posterName,
        postId: id,
      }).catch(console.error);

      return NextResponse.json({ success: true, status: newStatus });
    }
  } catch (err) {
    console.error("[POST /api/v1/posts/[id]/approve]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
