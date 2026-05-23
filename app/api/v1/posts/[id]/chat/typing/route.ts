import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { publishChatTyping } from "@/lib/pubsub";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ ok: false }, { status: 401 });

  const { id: postId } = await params;

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

  // Server-side debounce — publish at most once per 2s per user per post
  const key = `typing:${postId}:${session.user.id}`;
  const set = await redis.set(key, 1, "EX", 2, "NX");
  if (!set) return NextResponse.json({ ok: true }); // already published recently

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
