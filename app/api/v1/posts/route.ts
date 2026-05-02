import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RL } from "@/lib/rate-limit";
import { createPostSchema } from "@/lib/validations/post";
import { invalidate, CacheKey } from "@/lib/cache";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "0");
  const lng = parseFloat(searchParams.get("lng") ?? "0");
  const radius = Math.min(50, parseFloat(searchParams.get("radius") ?? "10"));
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "50") || 50),
  );

  try {
    const latDelta = radius / 111;
    const lngDelta = radius / (111 * Math.cos((lat * Math.PI) / 180));

    const where =
      lat && lng
        ? {
            status: "OPEN" as const,
            latitude: { gte: lat - latDelta, lte: lat + latDelta },
            longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
          }
        : { status: "OPEN" as const };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          status: true,
          description: true,
          bottleCount: true,
          estimatedValue: true,
          collectorSharePercent: true,
          latitude: true,
          longitude: true,
          locationName: true,
          address: true,
          images: true,
          createdAt: true,
          expiresAt: true,
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              reputationScore: true,
              ratingCount: true,
            },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[GET /api/v1/posts]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}

// ─── POST /api/v1/posts — create post (authenticated) ────────────────────────

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.write);
  if (!rl.ok) return rl.response;

  // ── Enforce: one active post per poster ──────────────────────────────────
  const existingActive = await prisma.post.findFirst({
    where: {
      authorId: session.user.id,
      status: { in: ["OPEN", "CLAIMED", "IN_PROGRESS"] },
    },
    select: { id: true, status: true },
  });

  if (existingActive) {
    return NextResponse.json(
      {
        error:
          "Ai deja un anunț activ. Finalizează-l sau anulează-l înainte de a crea unul nou.",
        activePostId: existingActive.id,
      },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
  }

  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Date invalide", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    const expiresAt = new Date(
      Date.now() + data.expiresInHours * 60 * 60 * 1000,
    );

    const post = await prisma.$transaction(async (tx) => {
      if (data.phone) {
        await tx.user.update({
          where: { id: session.user.id },
          data: { phone: data.phone },
        });
      }

      return tx.post.create({
        data: {
          authorId: session.user.id,
          bottleCount: data.bottleCount,
          estimatedValue: data.estimatedValue,
          collectorSharePercent: data.collectorSharePercent,
          description: data.description ?? "",
          latitude: data.latitude,
          longitude: data.longitude,
          locationName: data.locationName ?? null,
          address: data.address ?? null,
          images: data.images ?? [],
          expiresAt,
          status: "OPEN",
        },
        select: {
          id: true,
          status: true,
          bottleCount: true,
          estimatedValue: true,
          collectorSharePercent: true,
          description: true,
          latitude: true,
          longitude: true,
          locationName: true,
          createdAt: true,
          expiresAt: true,
        },
      });
    });

    await invalidate(CacheKey.posts(session.user.id, 1, 10, "all"));

    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/posts]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
