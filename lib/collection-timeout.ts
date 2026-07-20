import { prisma } from "./prisma";
import { redis } from "./redis";
import { publishPostStatus } from "./pubsub";
import { createNotification } from "./notifications";
import { resolveAcceptedRequest } from "./claim-requests";

interface TimedOutPost {
  id: string;
  authorId: string;
  collectorId: string | null;
  listingExpiresAt: Date | null;
}

/**
 * Releases an IN_PROGRESS collection whose 60-minute window has lapsed.
 *
 * The timeout is deliberately no-fault: from the data alone we cannot tell
 * whether the collector never showed up or the author was unreachable, so
 * neither reputation is touched (deliberately bailing is already covered by
 * the cancel flow, which does penalize). The post simply goes back to OPEN so
 * the bottles can still be collected — or to EXPIRED if the original listing
 * window has itself passed in the meantime.
 *
 * Returns the new status, or null if the post already left IN_PROGRESS
 * (e.g. completed or cancelled concurrently).
 */
export async function releaseTimedOutCollection(
  post: TimedOutPost,
): Promise<"OPEN" | "EXPIRED" | null> {
  const listingStillValid =
    !post.listingExpiresAt || post.listingExpiresAt > new Date();
  const newStatus = listingStillValid
    ? ("OPEN" as const)
    : ("EXPIRED" as const);

  try {
    await prisma.post.update({
      where: { id: post.id, status: "IN_PROGRESS" },
      data: {
        status: newStatus,
        collectorId: null,
        claimedAt: null,
        expiresAt: post.listingExpiresAt,
        listingExpiresAt: null,
      },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2025") return null;
    throw e;
  }

  await resolveAcceptedRequest(post.id, post.collectorId);

  await redis.del(`code:${post.id}`).catch(() => null);

  const affectedUsers = [
    post.authorId,
    ...(post.collectorId ? [post.collectorId] : []),
  ];
  publishPostStatus(
    { postId: post.id, status: newStatus, collectorId: null },
    affectedUsers,
  );

  await createNotification({
    userId: post.authorId,
    type: "POST_EXPIRED",
    title: "Timpul colectării a expirat ⏰",
    message: listingStillValid
      ? "Colectarea nu a fost confirmată în timpul alocat. Anunțul tău este din nou disponibil."
      : "Colectarea nu a fost confirmată în timpul alocat, iar anunțul a expirat între timp.",
    link: `/post/${post.id}`,
  }).catch((err) =>
    console.error("[collection-timeout] author notification error:", err),
  );

  if (post.collectorId) {
    await createNotification({
      userId: post.collectorId,
      type: "POST_EXPIRED",
      title: "Timpul colectării a expirat ⏰",
      message:
        "Fereastra de colectare s-a încheiat fără confirmarea codului, iar colectarea a fost eliberată automat.",
      link: `/post/${post.id}`,
    }).catch((err) =>
      console.error("[collection-timeout] collector notification error:", err),
    );
  }

  return newStatus;
}
