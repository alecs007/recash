import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cached, invalidate, CacheKey, TTL } from "@/lib/cache";
import { rateLimit, RL } from "@/lib/rate-limit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.read);
  if (!rl.ok) return rl.response;

  try {
    const user = await cached(
      CacheKey.profile(session.user.id),
      TTL.profile,
      () =>
        prisma.user.findUniqueOrThrow({
          where: { id: session.user.id },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            phone: true,
            createdAt: true,
            totalBottlesGiven: true,
            totalBottlesCollected: true,
            totalTransactions: true,
            totalEarned: true,
            totalSaved: true,
            reputationScore: true,
            ratingCount: true,
            cancelledCount: true,
            _count: {
              select: { posts: true, claimedPosts: true, badges: true },
            },
            posts: {
              take: 3,
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                description: true,
                status: true,
                createdAt: true,
                bottleCount: true,
                estimatedValue: true,
                locationName: true,
                collector: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    certified: true,
                  },
                },
                claimRequests: {
                  where: { status: "PENDING" },
                  orderBy: { createdAt: "asc" },
                  take: 4,
                  select: {
                    collector: {
                      select: { id: true, name: true, image: true },
                    },
                  },
                },
                _count: {
                  select: {
                    claimRequests: { where: { status: "PENDING" } },
                  },
                },
                transaction: {
                  select: {
                    actualValue: true,
                    collectorEarning: true,
                    posterEarning: true,
                    collectorRating: true,
                    posterRating: true,
                  },
                },
              },
            },
          },
        }),
    );

    return NextResponse.json(
      {
        ...user,
        posts: user.posts.map(({ _count, ...p }) => ({
          ...p,
          pendingRequestCount: _count.claimRequests,
        })),
      },
      {
        headers: {
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": String(rl.reset),
        },
      },
    );
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json(
        { error: "Utilizator negăsit" },
        { status: 404 },
      );
    }
    console.error("[GET /api/v1/profile]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
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

  const { name, phone } = body as Record<string, unknown>;

  if (name !== undefined) {
    if (
      typeof name !== "string" ||
      name.trim().length === 0 ||
      name.trim().length > 100
    ) {
      return NextResponse.json(
        { error: "Nume invalid (max 100 caractere)" },
        { status: 400 },
      );
    }
  }
  if (phone !== undefined) {
    if (typeof phone !== "string" || phone.trim().length > 20) {
      return NextResponse.json(
        { error: "Telefon invalid (max 20 caractere)" },
        { status: 400 },
      );
    }
    if (phone.trim().length > 0 && !/^[\d\s+\-()]+$/.test(phone.trim())) {
      return NextResponse.json(
        { error: "Format telefon invalid" },
        { status: 400 },
      );
    }
  }

  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name: (name as string).trim() }),
        ...(phone !== undefined && { phone: (phone as string).trim() || null }),
      },
      select: { id: true, name: true, phone: true },
    });

    await invalidate(CacheKey.profile(session.user.id));

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/v1/profile]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
