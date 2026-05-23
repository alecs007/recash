import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RL } from "@/lib/rate-limit";
import { publishChatMessage } from "@/lib/pubsub";
import { z } from "zod";

const MAX_MESSAGES = 100;

const CHAT_WRITE_RL = { limit: 30, windowSec: 60 };

const sendMessageSchema = z.object({
  text: z
    .string({ error: "Textul este obligatoriu" })
    .min(1, "Mesajul nu poate fi gol")
    .max(500, "Mesajul poate avea maxim 500 de caractere")
    .transform((s) => s.trim()),
});

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

  const rl = await rateLimit(session.user.id, CHAT_WRITE_RL);
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

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
  }

  const parsed = sendMessageSchema.safeParse(rawBody);
  if (!parsed.success) {
    const message = parsed.error?.message ?? "Date invalide";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { text } = parsed.data;

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
