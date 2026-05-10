import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RL } from "@/lib/rate-limit";
import { approveClaimSchema } from "@/lib/validations/post";
import { notifyClaimApproved, notifyClaimDenied } from "@/lib/notifications";
import { redis } from "@/lib/redis";
import { publishPostStatus } from "@/lib/pubsub";

const COLLECTION_WINDOW_MINUTES = 30;
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

  const { action } = parsed.data;

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { name: true } },
        collector: { select: { name: true } },
      },
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
    if (!post.collectorId) {
      return NextResponse.json(
        { error: "Nu există un colector activ" },
        { status: 409 },
      );
    }

    if (action === "approve") {
      const collectionDeadline = new Date(
        Date.now() + COLLECTION_WINDOW_MINUTES * 60 * 1000,
      );
      const code = generateCode();
      const ttlSeconds = COLLECTION_WINDOW_MINUTES * 60 + 300;
      await redis.set(`code:${id}`, code, "EX", ttlSeconds);

      await prisma.post.update({
        where: { id },
        data: { status: "IN_PROGRESS", expiresAt: collectionDeadline },
      });

      await notifyClaimApproved(
        post.collectorId,
        id,
        post.author.name ?? "Posterul",
      );

      // Push to both the post room and the collector's user channel
      publishPostStatus({
        postId: id,
        status: "IN_PROGRESS",
        collectorId: post.collectorId,
        expiresAt: collectionDeadline.toISOString(),
      });

      return NextResponse.json({
        success: true,
        status: "IN_PROGRESS",
        deadline: collectionDeadline.toISOString(),
      });
    } else {
      await prisma.post.update({
        where: { id },
        data: { status: "OPEN", collectorId: null, claimedAt: null },
      });

      await notifyClaimDenied(
        post.collectorId,
        id,
        post.author.name ?? "Posterul",
      );

      publishPostStatus({
        postId: id,
        status: "OPEN",
        collectorId: null,
      });

      return NextResponse.json({ success: true, status: "OPEN" });
    }
  } catch (err) {
    console.error("[POST /api/v1/posts/[id]/approve]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
