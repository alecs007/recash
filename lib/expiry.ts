import { prisma } from "./prisma";
import { publishPostStatus } from "./pubsub";

const INTERVAL_MS = 2 * 60 * 1000;

const g = globalThis as unknown as { __recashExpiryLoop?: boolean };

export function startExpiryLoop(): void {
  if (g.__recashExpiryLoop) return;
  g.__recashExpiryLoop = true;

  async function sweep() {
    try {
      const now = new Date();

      const expiring = await prisma.post.findMany({
        where: {
          status: "OPEN",
          expiresAt: { not: null, lt: now },
        },
        select: { id: true, authorId: true },
      });
      if (expiring.length === 0) return;

      const result = await prisma.post.updateMany({
        where: {
          id: { in: expiring.map((p) => p.id) },
          status: "OPEN",
        },
        data: { status: "EXPIRED" },
      });

      for (const p of expiring) {
        publishPostStatus({ postId: p.id, status: "EXPIRED" }, [p.authorId]);
      }

      if (result.count > 0) {
        console.log(`[expiry] expired ${result.count} OPEN post(s)`);
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
  if (status !== "OPEN") return false;
  if (!expiresAt || expiresAt > new Date()) return false;

  try {
    await prisma.post.update({
      where: { id: postId, status: "OPEN" },
      data: { status: "EXPIRED" },
    });
    publishPostStatus(
      { postId, status: "EXPIRED" },
      authorId ? [authorId] : [],
    );
    return true;
  } catch {
    return false;
  }
}
