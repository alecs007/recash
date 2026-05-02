import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        authorId: true,
        collectorId: true,
        expiresAt: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Anunț negăsit" }, { status: 404 });
    }

    if (post.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "QR disponibil doar pentru colectări active" },
        { status: 409 },
      );
    }

    const isParticipant =
      post.authorId === session.user.id || post.collectorId === session.user.id;

    if (!isParticipant) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    // Check deadline
    if (post.expiresAt && post.expiresAt < new Date()) {
      await prisma.post.update({ where: { id }, data: { status: "EXPIRED" } });
      return NextResponse.json(
        { error: "Fereastra de colectare a expirat" },
        { status: 410 },
      );
    }

    const token = await redis.get(`qr:${id}`);
    if (!token) {
      return NextResponse.json({ error: "Token QR expirat" }, { status: 410 });
    }

    // Return QR data — the token is only needed by the poster to display the QR
    // The collector scans and sends the token back via /complete
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const scanUrl = `${baseUrl}/api/v1/posts/${id}/complete?scan=1&token=${token}`;

    return NextResponse.json({
      token,
      scanUrl,
      deadline: post.expiresAt?.toISOString(),
      // QR image URL using free public API
      qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(scanUrl)}&size=250x250&margin=10&qzone=2`,
    });
  } catch (err) {
    console.error("[GET /api/v1/posts/[id]/qr]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
