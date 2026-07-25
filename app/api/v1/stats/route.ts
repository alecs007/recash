import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { rateLimit, RL, getClientIp } from "@/lib/rate-limit";

const CACHE_KEY = "stats:platform";
const CACHE_TTL = 60;

const ACTIVE_STATUSES = ["OPEN", "CLAIMED", "IN_PROGRESS"] as const;

export async function GET(req: Request) {
  const rl = await rateLimit(`ip:stats:${getClientIp(req)}`, RL.public);
  if (!rl.ok) return rl.response;

  try {
    const cached = await redis.get(CACHE_KEY).catch(() => null);
    if (cached) {
      return NextResponse.json(JSON.parse(cached), {
        headers: { "X-Cache": "HIT" },
      });
    }
  } catch {
    // Non-fatal cache miss — fall through to the database.
  }

  try {
    const [txAgg, completedExchanges, activeListings, openListings, users] =
      await Promise.all([
        prisma.transaction.aggregate({
          _sum: { bottleCount: true, actualValue: true },
        }),
        prisma.transaction.count(),
        prisma.post.count({ where: { status: { in: [...ACTIVE_STATUSES] } } }),
        prisma.post.count({ where: { status: "OPEN" } }),
        prisma.user.count(),
      ]);

    const payload = {
      bottlesRecycled: txAgg._sum.bottleCount ?? 0,
      valueRecycledRon: Math.round((txAgg._sum.actualValue ?? 0) * 100) / 100,
      completedExchanges,
      activeListings,
      openListings,
      users,
      generatedAt: new Date().toISOString(),
    };

    await redis
      .set(CACHE_KEY, JSON.stringify(payload), "EX", CACHE_TTL)
      .catch(() => {});

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    console.error("[GET /api/v1/stats]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
