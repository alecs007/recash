import { prisma } from "./prisma";
import { createNotification } from "./notifications";
import { publishToUser, publishPostStatus } from "./pubsub";

export { MAX_PENDING_REQUESTS_PER_COLLECTOR } from "./constants/posts";

export type ResolveReason =
  | "another_collector_chosen"
  | "post_cancelled"
  | "post_expired"
  | "post_completed";

const RESOLVE_MESSAGES: Record<
  ResolveReason,
  { title: string; message: string }
> = {
  another_collector_chosen: {
    title: "Autorul a ales alt colector",
    message:
      "Cererea ta nu a fost selectată de această dată. Dacă anunțul redevine disponibil, poți trimite o cerere nouă.",
  },
  post_cancelled: {
    title: "Anunț anulat",
    message: "Autorul a anulat anunțul pentru care ai trimis o cerere.",
  },
  post_expired: {
    title: "Anunțul a expirat",
    message: "Anunțul pentru care ai trimis o cerere a expirat între timp.",
  },
  post_completed: {
    title: "Anunț finalizat",
    message: "Sticlele au fost colectate de alt colector.",
  },
};

export async function resolvePendingRequests(
  postId: string,
  reason: ResolveReason,
  exceptCollectorId?: string,
): Promise<string[]> {
  const pending = await prisma.claimRequest.findMany({
    where: {
      postId,
      status: "PENDING",
      ...(exceptCollectorId ? { collectorId: { not: exceptCollectorId } } : {}),
    },
    select: { id: true, collectorId: true },
  });
  if (pending.length === 0) return [];

  await prisma.claimRequest.updateMany({
    where: { id: { in: pending.map((r) => r.id) }, status: "PENDING" },
    data: { status: "RESOLVED" },
  });

  const { title, message } = RESOLVE_MESSAGES[reason];
  const link =
    reason === "another_collector_chosen" ? "/map" : `/post/${postId}`;

  await Promise.all(
    pending.map(async (r) => {
      await createNotification({
        userId: r.collectorId,
        type: reason === "post_expired" ? "POST_EXPIRED" : "POST_CANCELLED",
        title,
        message,
        link,
        metadata: { postId, reason },
      });
      // The detail page treats `claim_denied` as "your request is gone" and
      // sends the collector back to the map.
      publishToUser(r.collectorId, {
        type: "post:cancelled",
        payload: {
          postId,
          cancelledBy: "poster",
          newStatus: reason === "post_expired" ? "EXPIRED" : "CANCELLED",
          reason: "claim_denied",
        },
      });
    }),
  );

  return pending.map((r) => r.collectorId);
}

export async function resolveAcceptedRequest(
  postId: string,
  collectorId: string | null,
): Promise<void> {
  if (!collectorId) return;
  await prisma.claimRequest
    .updateMany({
      where: { postId, collectorId, status: "ACCEPTED" },
      data: { status: "RESOLVED" },
    })
    .catch((err) =>
      console.error("[claim-requests] resolveAcceptedRequest error:", err),
    );
}

/** Number of PENDING requests on a post. */
export async function countPendingRequests(postId: string): Promise<number> {
  return prisma.claimRequest.count({ where: { postId, status: "PENDING" } });
}

export async function resolveCollectorPendingElsewhere(
  collectorId: string,
  exceptPostId: string,
): Promise<void> {
  const others = await prisma.claimRequest.findMany({
    where: {
      collectorId,
      status: "PENDING",
      postId: { not: exceptPostId },
    },
    select: { id: true, postId: true },
  });
  if (others.length === 0) return;

  await prisma.claimRequest.updateMany({
    where: { id: { in: others.map((r) => r.id) } },
    data: { status: "WITHDRAWN" },
  });

  const postIds = others.map((r) => r.postId);
  const [collector, posts, counts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: collectorId },
      select: { name: true },
    }),
    prisma.post.findMany({
      where: { id: { in: postIds } },
      select: { id: true, authorId: true },
    }),
    Promise.all(
      postIds.map(async (id) => ({
        id,
        remaining: await prisma.claimRequest.count({
          where: { postId: id, status: "PENDING" },
        }),
      })),
    ),
  ]);

  const name = collector?.name ?? "Un colector";
  const remainingByPost = new Map(counts.map((c) => [c.id, c.remaining]));
  const emptied = postIds.filter((id) => remainingByPost.get(id) === 0);

  if (emptied.length > 0) {
    await prisma.post.updateMany({
      where: { id: { in: emptied }, status: "CLAIMED" },
      data: { status: "OPEN", claimedAt: null, collectorId: null },
    });
  }

  await Promise.all(
    posts.map(async (post) => {
      const remaining = remainingByPost.get(post.id) ?? 0;
      await createNotification({
        userId: post.authorId,
        type: "POST_CANCELLED",
        title: "Cerere retrasă",
        message: `${name} a fost aprobat pe alt anunț și nu mai este disponibil.`,
        link: `/post/${post.id}`,
        metadata: { postId: post.id },
      });

      publishPostStatus(
        {
          postId: post.id,
          status: remaining === 0 ? "OPEN" : "CLAIMED",
          pendingRequestCount: remaining,
        },
        [post.authorId],
      );
    }),
  );
}
