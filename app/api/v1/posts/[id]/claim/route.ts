import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RL } from "@/lib/rate-limit";
import { notifyPostClaimed, createNotification } from "@/lib/notifications";
import { publishPostStatus } from "@/lib/pubsub";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.write);
  if (!rl.ok) return rl.response;

  const { id } = await params;

  try {
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return NextResponse.json({ error: "Anunț negăsit" }, { status: 404 });
    }

    if (post.status !== "OPEN") {
      return NextResponse.json(
        { error: "Anunțul nu mai este disponibil" },
        { status: 409 },
      );
    }

    if (post.authorId === session.user.id) {
      return NextResponse.json(
        { error: "Nu îți poți colecta propriul anunț" },
        { status: 403 },
      );
    }

    if (post.expiresAt && post.expiresAt < new Date()) {
      await prisma.post.update({ where: { id }, data: { status: "EXPIRED" } });
      return NextResponse.json({ error: "Anunțul a expirat" }, { status: 410 });
    }

    const existingCollection = await prisma.post.findFirst({
      where: {
        collectorId: session.user.id,
        status: { in: ["CLAIMED", "IN_PROGRESS"] },
      },
      select: { id: true },
    });

    if (existingCollection) {
      return NextResponse.json(
        {
          error:
            "Ai deja o colectare activă. Finalizează sau anulează colectarea curentă înainte de a prelua alta.",
        },
        { status: 409 },
      );
    }

    const updated = await prisma.post.update({
      where: { id, status: "OPEN" },
      data: {
        status: "CLAIMED",
        collectorId: session.user.id,
        claimedAt: new Date(),
      },
    });

    const collector = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });

    // Notify poster via DB + WS push
    await notifyPostClaimed(
      post.authorId,
      id,
      collector?.name ?? "Un colector",
      post.bottleCount,
    );

    await createNotification({
      userId: session.user.id,
      type: "POST_CLAIMED",
      title: "Cerere trimisă! ⏳",
      message: `Ai solicitat colectarea a ${post.bottleCount} sticle. Așteaptă aprobarea autorului.`,
      link: `/post/${id}`,
      metadata: { postId: id },
    });

    // Push post status update to everyone watching this post
    publishPostStatus(
      {
        postId: id,
        status: "CLAIMED",
        collectorId: session.user.id,
        collectorName: collector?.name ?? null,
      },
      [post.authorId],
    );

    return NextResponse.json({ success: true, status: updated.status });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json(
        { error: "Anunțul a fost revendicat de altcineva" },
        { status: 409 },
      );
    }
    console.error("[POST /api/v1/posts/[id]/claim]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
