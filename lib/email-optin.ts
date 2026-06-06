import { redis } from "./redis";
import { prisma } from "./prisma";
import {
  sendCollectorRequestEmail,
  sendClaimApprovedEmail,
  sendClaimDeniedEmail,
} from "./email";

async function getUserEmail(userId: string): Promise<string | null> {
  // Try Redis cache first (populated during opt-in to avoid extra DB hits)
  try {
    const cached = await redis.get(`email-optin:email:${userId}`);
    if (cached) return cached;
  } catch {}

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email ?? null;
  } catch {
    return null;
  }
}

async function getUserName(userId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    return user?.name?.split(" ")[0] ?? "utilizator";
  } catch {
    return "utilizator";
  }
}

async function isOptedIn(
  userId: string,
  postId: string,
  context: "author" | "collector",
): Promise<boolean> {
  try {
    const key = `email-optin:${userId}:${postId}:${context}`;
    const val = await redis.get(key);
    return val === "1";
  } catch {
    return false;
  }
}

export async function maybeEmailCollectorRequest({
  authorId,
  collectorName,
  bottleCount,
  postId,
}: {
  authorId: string;
  collectorName: string;
  bottleCount: number;
  postId: string;
}) {
  try {
    const opted = await isOptedIn(authorId, postId, "author");
    if (!opted) return;

    const [email, name] = await Promise.all([
      getUserEmail(authorId),
      getUserName(authorId),
    ]);
    if (!email) return;

    await sendCollectorRequestEmail({
      to: email,
      authorName: name,
      collectorName,
      bottleCount,
      postId,
    });
  } catch (err) {
    console.error("[maybeEmailCollectorRequest]", err);
  }
}

export async function maybeEmailClaimApproved({
  collectorId,
  posterName,
  bottleCount,
  postId,
}: {
  collectorId: string;
  posterName: string;
  bottleCount: number;
  postId: string;
}) {
  try {
    const opted = await isOptedIn(collectorId, postId, "collector");
    if (!opted) return;

    const [email, name] = await Promise.all([
      getUserEmail(collectorId),
      getUserName(collectorId),
    ]);
    if (!email) return;

    await sendClaimApprovedEmail({
      to: email,
      collectorName: name,
      posterName,
      bottleCount,
      postId,
    });
  } catch (err) {
    console.error("[maybeEmailClaimApproved]", err);
  }
}

export async function maybeEmailClaimDenied({
  collectorId,
  posterName,
  postId,
}: {
  collectorId: string;
  posterName: string;
  postId: string;
}) {
  try {
    const opted = await isOptedIn(collectorId, postId, "collector");
    if (!opted) return;

    const [email, name] = await Promise.all([
      getUserEmail(collectorId),
      getUserName(collectorId),
    ]);
    if (!email) return;

    await sendClaimDeniedEmail({
      to: email,
      collectorName: name,
      posterName,
      postId,
    });
  } catch (err) {
    console.error("[maybeEmailClaimDenied]", err);
  }
}
