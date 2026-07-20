import { prisma } from "./prisma";
import { createNotification } from "./notifications";
import { publishToUser } from "./pubsub";

export const MAX_PENDING_REQUESTS_PER_COLLECTOR = 1;

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

/**
 * Resolves a collector's ACCEPTED request when their collection ends without
 * completing (timeout, bail-out, author cancel), so the stale row doesn't
 * block them from re-requesting the post.
 */
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
