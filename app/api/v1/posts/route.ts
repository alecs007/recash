import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RL } from "@/lib/rate-limit";
import { invalidate, CacheKey } from "@/lib/cache";
import { checkPostBadges } from "@/lib/badges";

const ACTIVE_STATUSES = ["OPEN", "CLAIMED", "IN_PROGRESS"] as const;

// ─── GET /api/v1/posts ────────────────────────────────────────────────────────
// Public endpoint — returns open, non-expired posts for the map feed

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    200,
    Math.max(1, parseInt(searchParams.get("limit") ?? "100") || 100),
  );

  try {
    const posts = await prisma.post.findMany({
      where: {
        status: "OPEN",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
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
    });

    return NextResponse.json(
      { posts },
      {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
        },
      },
    );
  } catch (err) {
    console.error("[GET /api/v1/posts]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}

// ─── POST /api/v1/posts ───────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.write);
  if (!rl.ok) return rl.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
  }

  const {
    description,
    bottleCount,
    estimatedValue,
    collectorSharePercent,
    latitude,
    longitude,
    locationName,
    address,
    images,
  } = body as Record<string, unknown>;

  // ── Validate ────────────────────────────────────────────────────────────────

  if (
    typeof description !== "string" ||
    description.trim().length === 0 ||
    description.trim().length > 500
  ) {
    return NextResponse.json(
      { error: "Descrierea trebuie să aibă între 1 și 500 de caractere" },
      { status: 400 },
    );
  }

  if (
    typeof bottleCount !== "number" ||
    !Number.isInteger(bottleCount) ||
    bottleCount < 1 ||
    bottleCount > 10_000
  ) {
    return NextResponse.json(
      { error: "Numărul de sticle trebuie să fie între 1 și 10.000" },
      { status: 400 },
    );
  }

  if (
    typeof estimatedValue !== "number" ||
    estimatedValue < 0 ||
    estimatedValue > 100_000
  ) {
    return NextResponse.json(
      { error: "Valoarea estimată este invalidă" },
      { status: 400 },
    );
  }

  if (
    typeof collectorSharePercent !== "number" ||
    !Number.isInteger(collectorSharePercent) ||
    collectorSharePercent < 1 ||
    collectorSharePercent > 99
  ) {
    return NextResponse.json(
      { error: "Procentul colectorului trebuie să fie între 1% și 99%" },
      { status: 400 },
    );
  }

  if (
    typeof latitude !== "number" ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== "number" ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json(
      { error: "Coordonate geografice invalide" },
      { status: 400 },
    );
  }

  if (
    locationName !== undefined &&
    (typeof locationName !== "string" || locationName.length > 200)
  ) {
    return NextResponse.json(
      { error: "Numele locației este prea lung (max 200 caractere)" },
      { status: 400 },
    );
  }

  const safeImages: string[] = [];
  if (images !== undefined) {
    if (!Array.isArray(images) || images.length > 5) {
      return NextResponse.json(
        { error: "Poți atașa cel mult 5 imagini" },
        { status: 400 },
      );
    }
    for (const img of images) {
      if (typeof img !== "string" || img.length > 2048) {
        return NextResponse.json(
          { error: "URL imagine invalid" },
          { status: 400 },
        );
      }
      safeImages.push(img);
    }
  }

  // ── Enforce one active post per user ────────────────────────────────────────

  const existingActive = await prisma.post.findFirst({
    where: {
      authorId: session.user.id,
      status: { in: [...ACTIVE_STATUSES] },
    },
    select: { id: true, status: true },
  });

  if (existingActive) {
    return NextResponse.json(
      {
        error:
          "Ai deja o postare activă. Finalizează sau anulează postarea curentă înainte de a crea una nouă.",
        existingPostId: existingActive.id,
      },
      { status: 409 },
    );
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  try {
    const post = await prisma.post.create({
      data: {
        authorId: session.user.id,
        description: description.trim(),
        bottleCount,
        estimatedValue,
        collectorSharePercent,
        latitude,
        longitude,
        locationName:
          typeof locationName === "string" ? locationName.trim() || null : null,
        address: typeof address === "string" ? address.trim() || null : null,
        images: safeImages,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      select: { id: true, status: true, createdAt: true },
    });

    // Invalidate cached post lists for this user
    await invalidate(
      CacheKey.posts(session.user.id, "all"),
      CacheKey.posts(session.user.id, "active"),
    );

    // Award badges asynchronously — never block the response
    checkPostBadges(session.user.id).catch((err) =>
      console.error("[posts] badge check error:", err),
    );

    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/posts]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
