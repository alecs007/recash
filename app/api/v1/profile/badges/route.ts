import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cached, CacheKey, TTL } from "@/lib/cache";
import { rateLimit, RL } from "@/lib/rate-limit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.read);
  if (!rl.ok) return rl.response;

  const cacheKey = CacheKey.badges(session.user.id);

  try {
    const badges = await cached(cacheKey, TTL.badges, () =>
      prisma.badge.findMany({
        where: { userId: session.user.id },
        orderBy: { earnedAt: "desc" },
        select: { id: true, type: true, earnedAt: true, seen: true },
      }),
    );

    return NextResponse.json(badges);
  } catch (err) {
    console.error("[GET /api/v1/profile/badges]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
