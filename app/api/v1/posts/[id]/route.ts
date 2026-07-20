import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { maybeExpirePost } from "@/lib/expiry";
import { releaseTimedOutCollection } from "@/lib/collection-timeout";
import { rateLimit, RL, getClientIp } from "@/lib/rate-limit";
import { isValidObjectId } from "@/lib/validate";
import { approximateCoords } from "@/lib/geo";

const collectorPublicSelect = {
  id: true,
  name: true,
  image: true,
  certified: true,
  reputationScore: true,
  ratingCount: true,
} as const;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  const rl = await rateLimit(
    session?.user?.id ? session.user.id : `ip:post-detail:${getClientIp(req)}`,
    session?.user?.id ? RL.read : RL.public,
  );
  if (!rl.ok) return rl.response;

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Anunț negăsit" }, { status: 404 });
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            certified: true,
            reputationScore: true,
            ratingCount: true,
            phone: true,
          },
        },
        collector: {
          select: { ...collectorPublicSelect, phone: true },
        },
        claimRequests: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            collectorId: true,
            status: true,
            createdAt: true,
            collector: { select: collectorPublicSelect },
          },
        },
        transaction: {
          select: {
            id: true,
            actualValue: true,
            collectorEarning: true,
            posterEarning: true,
            collectorRating: true,
            posterRating: true,
            collectorReview: true,
            posterReview: true,
            completedAt: true,
            posterRatedAt: true,
            collectorRatedAt: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Anunț negăsit" }, { status: 404 });
    }

    if (!post.author) {
      console.error(`Post ${id} is orphaned. No author found.`);
      return NextResponse.json(
        { error: "Datele autorului sunt corupte" },
        { status: 500 },
      );
    }

    const userId = session?.user?.id;

    if (post.status === "OPEN" || post.status === "CLAIMED") {
      const didExpire = await maybeExpirePost(
        post.id,
        post.status,
        post.expiresAt,
        post.authorId,
      );
      if (didExpire) {
        post.status = "EXPIRED";
        post.claimedAt = null;
        post.claimRequests = [];
      }
    }

    // Self-heal: a CLAIMED post with no pending requests belongs back in OPEN.
    if (post.status === "CLAIMED" && post.claimRequests.length === 0) {
      const reopened = await prisma.post.updateMany({
        where: { id: post.id, status: "CLAIMED" },
        data: { status: "OPEN", claimedAt: null, collectorId: null },
      });
      if (reopened.count > 0) {
        post.status = "OPEN";
        post.claimedAt = null;
      }
    }

    if (
      post.status === "IN_PROGRESS" &&
      post.expiresAt &&
      post.expiresAt < new Date()
    ) {
      const released = await releaseTimedOutCollection({
        id: post.id,
        authorId: post.authorId,
        collectorId: post.collectorId,
        listingExpiresAt: post.listingExpiresAt,
      });
      if (released) {
        post.status = released;
        post.expiresAt = post.listingExpiresAt;
        post.listingExpiresAt = null;
        post.collectorId = null;
        post.collector = null;
        post.claimedAt = null;
      }
    }

    const isAuthor = userId === post.authorId;
    const isCollector = !!userId && userId === post.collectorId;
    const isParticipant = isAuthor || isCollector;

    const pendingRequestCount = post.claimRequests.length;

    const myRequest =
      userId && !isAuthor
        ? await prisma.claimRequest.findUnique({
            where: { postId_collectorId: { postId: id, collectorId: userId } },
            select: { status: true, createdAt: true },
          })
        : null;

    // Exact pin/address: author always, bound collector once approved.
    const canSeeExactLocation =
      isAuthor ||
      (isCollector &&
        (post.status === "IN_PROGRESS" || post.status === "COMPLETED"));

    // Requester identities go to the author only; everyone else gets the count.
    const { claimRequests, ...rest } = post;
    const base = {
      ...rest,
      ...(canSeeExactLocation
        ? {}
        : {
            ...approximateCoords(post.latitude, post.longitude),
            address: null,
          }),
      pendingRequestCount,
      claimRequests: isAuthor ? claimRequests : undefined,
      myRequest,
    };

    if (!isParticipant) {
      return NextResponse.json({
        ...base,
        author: { ...post.author, phone: null },
        collector: post.collector ? { ...post.collector, phone: null } : null,
      });
    }

    const showPhone = isParticipant && post.status === "IN_PROGRESS";
    return NextResponse.json({
      ...base,
      author: { ...post.author, phone: showPhone ? post.author?.phone : null },
      collector: post.collector
        ? { ...post.collector, phone: showPhone ? post.collector?.phone : null }
        : null,
      isAuthor,
      isCollector,
    });
  } catch (err) {
    console.error("[GET /api/v1/posts/[id]]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
