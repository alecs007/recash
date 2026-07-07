import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { publishChatTyping } from "@/lib/pubsub";
import { rateLimit } from "@/lib/rate-limit";
import { isValidObjectId } from "@/lib/validate";

const TYPING_RL = { limit: 30, windowSec: 60 };

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ ok: false }, { status: 401 });

  const rl = await rateLimit(`${session.user.id}:chat-typing`, TYPING_RL);
  if (!rl.ok) return rl.response;

  const { id: postId } = await params;

  if (!isValidObjectId(postId)) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, collectorId: true, status: true },
  });

  if (
    !post ||
    post.status !== "IN_PROGRESS" ||
    (post.authorId !== session.user.id && post.collectorId !== session.user.id)
  )
    return NextResponse.json({ ok: false }, { status: 403 });

  const key = `typing:${postId}:${session.user.id}`;
  const set = await redis.set(key, 1, "EX", 2, "NX");
  if (!set) return NextResponse.json({ ok: true });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });

  publishChatTyping(postId, {
    postId,
    senderId: session.user.id,
    senderName: user?.name ?? null,
  });

  return NextResponse.json({ ok: true });
}
