import { prisma } from "./prisma";
import { publishPostStatus } from "./pubsub";
import { releaseTimedOutCollection } from "./collection-timeout";
import { resolvePendingRequests } from "./claim-requests";

const INTERVAL_MS = 2 * 60 * 1000;

const g = globalThis as unknown as { __recashExpiryLoop?: boolean };

export function startExpiryLoop(): void {
  if (g.__recashExpiryLoop) return;
  g.__recashExpiryLoop = true;

  async function sweep() {
    // Stage 2: IN_PROGRESS collections whose 60-minute window lapsed are
    // released (no-fault) — back to OPEN, or EXPIRED if the listing's own
    // expiry has also passed.
    try {
      const timedOut = await prisma.post.findMany({
        where: {
          status: "IN_PROGRESS",
          expiresAt: { not: null, lt: new Date() },
        },
        select: {
          id: true,
          authorId: true,
          collectorId: true,
          listingExpiresAt: true,
        },
      });
      for (const p of timedOut) {
        await releaseTimedOutCollection(p).catch((err) =>
          console.error("[expiry] release error:", err),
        );
      }
      if (timedOut.length > 0) {
        console.log(
          `[expiry] released ${timedOut.length} timed-out collection(s)`,
        );
      }
    } catch (err) {
      console.error("[expiry] timeout sweep error:", err);
    }

    try {
      const now = new Date();

      // OPEN and (always-unbound) CLAIMED posts expire with the listing.
      // IN_PROGRESS is handled by the timeout sweep above.
      const expiring = await prisma.post.findMany({
        where: {
          status: { in: ["OPEN", "CLAIMED"] },
          expiresAt: { not: null, lt: now },
        },
        select: { id: true, authorId: true, status: true },
      });
      if (expiring.length === 0) return;

      const result = await prisma.post.updateMany({
        where: {
          id: { in: expiring.map((p) => p.id) },
          status: { in: ["OPEN", "CLAIMED"] },
        },
        data: { status: "EXPIRED", claimedAt: null },
      });

      for (const p of expiring) {
        if (p.status === "CLAIMED") {
          await resolvePendingRequests(p.id, "post_expired").catch((err) =>
            console.error("[expiry] request resolve error:", err),
          );
        }
        publishPostStatus({ postId: p.id, status: "EXPIRED" }, [p.authorId]);
      }

      if (result.count > 0) {
        console.log(`[expiry] expired ${result.count} post(s)`);
      }
    } catch (err) {
      console.error("[expiry] sweep error:", err);
    }
  }

  sweep();

  const timer = setInterval(sweep, INTERVAL_MS);

  if (timer.unref) timer.unref();
}

export async function maybeExpirePost(
  postId: string,
  status: string,
  expiresAt: Date | null,
  authorId?: string,
): Promise<boolean> {
  if (status !== "OPEN" && status !== "CLAIMED") return false;
  if (!expiresAt || expiresAt > new Date()) return false;

  try {
    const result = await prisma.post.updateMany({
      where: {
        id: postId,
        status: { in: ["OPEN", "CLAIMED"] },
      },
      data: { status: "EXPIRED", claimedAt: null },
    });
    if (result.count === 0) return false;

    if (status === "CLAIMED") {
      await resolvePendingRequests(postId, "post_expired").catch((err) =>
        console.error("[expiry] request resolve error:", err),
      );
    }
    publishPostStatus(
      { postId, status: "EXPIRED" },
      authorId ? [authorId] : [],
    );
    return true;
  } catch {
    return false;
  }
}
