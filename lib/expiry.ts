import { prisma } from "./prisma";

const INTERVAL_MS = 2 * 60 * 1000;

let _started = false;

export function startExpiryLoop(): void {
  if (_started) return;
  _started = true;

  async function sweep() {
    try {
      const now = new Date();

      const result = await prisma.post.updateMany({
        where: {
          status: "OPEN",
          expiresAt: { lt: now },
        },
        data: { status: "EXPIRED" },
      });

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
): Promise<boolean> {
  if (status !== "OPEN") return false;
  if (!expiresAt || expiresAt > new Date()) return false;

  try {
    await prisma.post.update({
      where: { id: postId, status: "OPEN" },
      data: { status: "EXPIRED" },
    });
    return true;
  } catch {
    return false;
  }
}
