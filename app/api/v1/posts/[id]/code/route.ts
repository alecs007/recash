import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { rateLimit, RL } from "@/lib/rate-limit";
import { isValidObjectId } from "@/lib/validate";
import { releaseTimedOutCollection } from "@/lib/collection-timeout";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.read);
  if (!rl.ok) return rl.response;

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "ID invalid" }, { status: 400 });
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        status: true,
        authorId: true,
        collectorId: true,
        expiresAt: true,
        listingExpiresAt: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Anunț negăsit" }, { status: 404 });
    }

    if (post.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Codul este disponibil doar pentru colectări active" },
        { status: 409 },
      );
    }

    const isParticipant =
      post.authorId === session.user.id || post.collectorId === session.user.id;

    if (!isParticipant) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    if (post.expiresAt && post.expiresAt < new Date()) {
      await releaseTimedOutCollection({
        id,
        authorId: post.authorId,
        collectorId: post.collectorId,
        listingExpiresAt: post.listingExpiresAt,
      });
      return NextResponse.json(
        { error: "Fereastra de colectare a expirat" },
        { status: 410 },
      );
    }

    const code = await redis.get(`code:${id}`);
    if (!code) {
      return NextResponse.json(
        { error: "Cod expirat. Contactează posterul." },
        { status: 410 },
      );
    }

    return NextResponse.json({
      code,
      deadline: post.expiresAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error("[GET /api/v1/posts/[id]/code]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
