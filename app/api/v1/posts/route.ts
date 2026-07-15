import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RL, getClientIp } from "@/lib/rate-limit";
import { invalidate, CacheKey } from "@/lib/cache";
import { checkPostBadges } from "@/lib/badges";
import { startExpiryLoop } from "@/lib/expiry";
import { dispatchRadarNotifications } from "@/lib/radar";
import { createPostSchema } from "@/lib/validations/post";

startExpiryLoop();

export async function GET(req: Request) {
  const rl = await rateLimit(`ip:posts-feed:${getClientIp(req)}`, RL.public);
  if (!rl.ok) return rl.response;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    200,
    Math.max(1, parseInt(searchParams.get("limit") ?? "100") || 100),
  );

  try {
    const posts = await prisma.post.findMany({
      where: {
        status: "OPEN",
        OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
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
        address: true,
        images: true,
        createdAt: true,
        expiresAt: true,
        availabilitySchedule: true,
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

const ACTIVE_STATUSES = ["OPEN", "CLAIMED", "IN_PROGRESS"] as const;

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

  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Date invalide", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

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

  try {
    const post = await prisma.post.create({
      data: {
        authorId: session.user.id,
        description: data.description,
        bottleCount: data.bottleCount,
        estimatedValue: data.estimatedValue,
        collectorSharePercent: data.collectorSharePercent,
        latitude: data.latitude,
        longitude: data.longitude,
        locationName: data.locationName?.trim() || null,
        address: data.address?.trim() || null,
        images: data.images,
        expiresAt:
          data.expiresInHours === null
            ? null
            : new Date(Date.now() + data.expiresInHours * 60 * 60 * 1000),
        availabilitySchedule: data.availabilitySchedule,
      },
      select: { id: true, status: true, createdAt: true },
    });

    await invalidate(
      CacheKey.posts(session.user.id, "all"),
      CacheKey.posts(session.user.id, "active"),
    );

    checkPostBadges(session.user.id).catch((err) =>
      console.error("[posts] badge check error:", err),
    );

    dispatchRadarNotifications({
      postId: post.id,
      postAuthorId: session.user.id,
      postLatitude: data.latitude,
      postLongitude: data.longitude,
      postLocationName: data.locationName?.trim() || null,
      bottleCount: data.bottleCount,
      estimatedValue: data.estimatedValue,
      collectorSharePercent: data.collectorSharePercent,
    }).catch(console.error);

    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/posts]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
