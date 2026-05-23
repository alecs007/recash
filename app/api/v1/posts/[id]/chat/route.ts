import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RL } from "@/lib/rate-limit";
import { publishChatMessage } from "@/lib/pubsub";

const MAX_TEXT = 500;
const MAX_MESSAGES = 100;

async function assertParticipant(postId: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, collectorId: true, status: true },
  });
  if (!post) return null;
  const isParticipant = post.authorId === userId || post.collectorId === userId;
  return isParticipant ? post : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

  const rl = await rateLimit(session.user.id, RL.read);
  if (!rl.ok) return rl.response;

  const { id: postId } = await params;
  const post = await assertParticipant(postId, session.user.id);
  if (!post)
    return NextResponse.json({ error: "Acces interzis" }, { status: 403 });

  try {
    const messages = await prisma.chatMessage.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      take: MAX_MESSAGES,
      select: {
        id: true,
        postId: true,
        senderId: true,
        text: true,
        createdAt: true,
        sender: { select: { name: true, image: true } },
      },
    });

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        postId: m.postId,
        senderId: m.senderId,
        senderName: m.sender.name,
        senderImage: m.sender.image,
        text: m.text,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[GET /api/v1/posts/[id]/chat]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });

  const rl = await rateLimit(session.user.id, RL.write);
  if (!rl.ok) return rl.response;

  const { id: postId } = await params;
  const post = await assertParticipant(postId, session.user.id);
  if (!post)
    return NextResponse.json({ error: "Acces interzis" }, { status: 403 });

  if (post.status !== "IN_PROGRESS")
    return NextResponse.json(
      { error: "Chat disponibil doar în timpul colectării" },
      { status: 409 },
    );

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
  }

  const text =
    typeof (body as Record<string, unknown>).text === "string"
      ? ((body as Record<string, unknown>).text as string).trim()
      : "";

  if (!text || text.length > MAX_TEXT)
    return NextResponse.json(
      { error: `Mesajul trebuie să aibă între 1 și ${MAX_TEXT} caractere` },
      { status: 400 },
    );

  try {
    const [msg, sender] = await Promise.all([
      prisma.chatMessage.create({
        data: { postId, senderId: session.user.id, text },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, image: true },
      }),
    ]);

    const payload = {
      id: msg.id,
      postId,
      senderId: session.user.id,
      senderName: sender?.name ?? null,
      senderImage: sender?.image ?? null,
      text: msg.text,
      createdAt: msg.createdAt.toISOString(),
    };

    publishChatMessage(postId, payload);

    return NextResponse.json({ ok: true, message: payload }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/posts/[id]/chat]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
