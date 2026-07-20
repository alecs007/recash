import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RL } from "@/lib/rate-limit";
import { isValidObjectId } from "@/lib/validate";
import { notifyPostClaimed, createNotification } from "@/lib/notifications";
import { publishPostStatus } from "@/lib/pubsub";
import { maybeEmailCollectorRequest } from "@/lib/email-optin";
import { isCurrentlyAvailable } from "@/lib/availability";
import type { DaySchedule } from "@/lib/availability";
import {
  MAX_PENDING_REQUESTS_PER_COLLECTOR,
  countPendingRequests,
  resolvePendingRequests,
} from "@/lib/claim-requests";
import { invalidate, CacheKey } from "@/lib/cache";

/**
 * POST — send a collect request.
 *
 * Several collectors can have PENDING requests on the same post. The post
 * moves OPEN → CLAIMED on the first request but stays visible on the map and
 * keeps `collectorId = null`; the collector identity is only bound to the
 * post when the author approves a request.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }
  const userId = session.user.id;

  const rl = await rateLimit(`${userId}:posts-claim`, RL.write);
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

    if (
      (post.status !== "OPEN" && post.status !== "CLAIMED") ||
      post.collectorId
    ) {
      return NextResponse.json(
        { error: "Anunțul nu mai este disponibil" },
        { status: 409 },
      );
    }

    if (post.availabilitySchedule) {
      const schedule = post.availabilitySchedule as unknown as DaySchedule[];
      if (!isCurrentlyAvailable(schedule)) {
        return NextResponse.json(
          {
            error:
              "Anunțul nu este disponibil acum. Verifică orele de disponibilitate.",
          },
          { status: 409 },
        );
      }
    }

    if (post.authorId === userId) {
      return NextResponse.json(
        { error: "Nu îți poți colecta propriul anunț" },
        { status: 403 },
      );
    }

    if (post.expiresAt && post.expiresAt < new Date()) {
      await prisma.post.updateMany({
        where: { id, status: { in: ["OPEN", "CLAIMED"] } },
        data: { status: "EXPIRED" },
      });
      await resolvePendingRequests(id, "post_expired");
      return NextResponse.json({ error: "Anunțul a expirat" }, { status: 410 });
    }

    const [inProgress, myPendingCount] = await Promise.all([
      prisma.post.findFirst({
        where: { collectorId: userId, status: "IN_PROGRESS" },
        select: { id: true },
      }),
      prisma.claimRequest.count({
        where: { collectorId: userId, status: "PENDING" },
      }),
    ]);

    if (inProgress) {
      return NextResponse.json(
        {
          error:
            "Ai o colectare în desfășurare. Finalizează sau anulează colectarea curentă înainte de a trimite alte cereri.",
        },
        { status: 409 },
      );
    }

    if (myPendingCount >= MAX_PENDING_REQUESTS_PER_COLLECTOR) {
      return NextResponse.json(
        {
          error: `Poți avea maxim ${MAX_PENDING_REQUESTS_PER_COLLECTOR} cereri de colectare în așteptare. Retrage una înainte de a trimite alta.`,
        },
        { status: 409 },
      );
    }

    const existing = await prisma.claimRequest.findUnique({
      where: { postId_collectorId: { postId: id, collectorId: userId } },
      select: { status: true },
    });
    if (existing?.status === "PENDING" || existing?.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "Ai trimis deja o cerere pentru acest anunț" },
        { status: 409 },
      );
    }
    // A declined request is final for this post; only WITHDRAWN/RESOLVED
    // requests may be re-sent.
    if (existing?.status === "DECLINED") {
      return NextResponse.json(
        { error: "Autorul a refuzat deja cererea ta pentru acest anunț" },
        { status: 409 },
      );
    }

    // Write the request first, then reconcile post status with conditional
    // single-doc writes — a multi-doc transaction would write-conflict when
    // two collectors race to flip the same post OPEN→CLAIMED.
    await prisma.claimRequest.upsert({
      where: { postId_collectorId: { postId: id, collectorId: userId } },
      create: { postId: id, collectorId: userId },
      update: { status: "PENDING", createdAt: new Date() },
    });

    // If the post left the requestable state between the first read and the
    // upsert, retire the request we just created.
    const fresh = await prisma.post.findUnique({
      where: { id },
      select: { status: true, collectorId: true },
    });
    if (
      !fresh ||
      (fresh.status !== "OPEN" && fresh.status !== "CLAIMED") ||
      fresh.collectorId
    ) {
      await prisma.claimRequest.updateMany({
        where: { postId: id, collectorId: userId, status: "PENDING" },
        data: { status: "RESOLVED" },
      });
      return NextResponse.json(
        { error: "Anunțul nu mai este disponibil" },
        { status: 409 },
      );
    }

    if (fresh.status === "OPEN") {
      await prisma.post.updateMany({
        where: { id, status: "OPEN" },
        data: { status: "CLAIMED", claimedAt: new Date(), collectorId: null },
      });
    }

    const [collector, pendingCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      }),
      countPendingRequests(id),
    ]);

    const collectorName = collector?.name ?? "Un colector";

    await notifyPostClaimed(post.authorId, id, collectorName, post.bottleCount);

    await createNotification({
      userId,
      type: "POST_CLAIMED",
      title: "Cerere trimisă! ⏳",
      message: `Ai solicitat colectarea celor ${post.bottleCount} sticle. Așteaptă aprobarea autorului.`,
      link: `/post/${id}`,
      metadata: { postId: id },
    });

    // Only the count is broadcast — collector identity stays private until
    // the author approves.
    publishPostStatus(
      { postId: id, status: "CLAIMED", pendingRequestCount: pendingCount },
      [post.authorId],
    );

    await invalidate(
      CacheKey.posts(post.authorId, "active"),
      CacheKey.posts(post.authorId, "all"),
    );

    maybeEmailCollectorRequest({
      authorId: post.authorId,
      collectorName,
      bottleCount: post.bottleCount,
      postId: id,
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      status: "CLAIMED",
      requestStatus: "PENDING",
      pendingRequestCount: pendingCount,
    });
  } catch (err: unknown) {
    console.error("[POST /api/v1/posts/[id]/claim]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}

/**
 * DELETE — withdraw my pending request.
 *
 * Only PENDING requests can be withdrawn; once approved, backing out goes
 * through the cancel flow (which carries a reputation penalty). If the last
 * pending request is withdrawn the post returns to OPEN.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }
  const userId = session.user.id;

  const rl = await rateLimit(`${userId}:posts-claim`, RL.write);
  if (!rl.ok) return rl.response;

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Anunț negăsit" }, { status: 404 });
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true, authorId: true, status: true },
    });
    if (!post) {
      return NextResponse.json({ error: "Anunț negăsit" }, { status: 404 });
    }

    // Conditional on PENDING: misses (P2025) if already approved.
    try {
      await prisma.claimRequest.update({
        where: {
          postId_collectorId: { postId: id, collectorId: userId },
          status: "PENDING",
        },
        data: { status: "WITHDRAWN" },
      });
    } catch (e) {
      if ((e as { code?: string }).code === "P2025") {
        return NextResponse.json(
          { error: "Nu ai o cerere activă pentru acest anunț." },
          { status: 409 },
        );
      }
      throw e;
    }

    // Reconcile after the withdrawal commits (not in a snapshot transaction)
    // so the last collector to withdraw reliably reopens the post.
    let newStatus: "OPEN" | "CLAIMED" = "CLAIMED";
    const remaining = await prisma.claimRequest.count({
      where: { postId: id, status: "PENDING" },
    });
    if (remaining === 0) {
      // status-only filter: Prisma's `collectorId: null` misses a missing
      // field (MongoDB); CLAIMED already implies no bound collector.
      await prisma.post.updateMany({
        where: { id, status: "CLAIMED" },
        data: { status: "OPEN", claimedAt: null, collectorId: null },
      });
      newStatus = "OPEN";
    }

    const collector = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    await createNotification({
      userId: post.authorId,
      type: "POST_CANCELLED",
      title: "Cerere retrasă",
      message: `${collector?.name ?? "Un colector"} și-a retras cererea de colectare.`,
      link: `/post/${id}`,
      metadata: { postId: id },
    });

    publishPostStatus(
      { postId: id, status: newStatus, pendingRequestCount: remaining },
      [post.authorId],
    );

    await invalidate(
      CacheKey.posts(post.authorId, "active"),
      CacheKey.posts(post.authorId, "all"),
    );

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    console.error("[DELETE /api/v1/posts/[id]/claim]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
