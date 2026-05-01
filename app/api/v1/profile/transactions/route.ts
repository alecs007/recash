import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cached, CacheKey, TTL } from "@/lib/cache";
import { rateLimit, RL } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.read);
  if (!rl.ok) return rl.response;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("limit") ?? "10") || 10),
  );
  const skip = (page - 1) * limit;

  const where = {
    OR: [{ posterId: session.user.id }, { collectorId: session.user.id }],
  };

  const cacheKey = CacheKey.transactions(session.user.id, page, limit);

  try {
    const result = await cached(cacheKey, TTL.transactions, async () => {
      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          orderBy: { completedAt: "desc" },
          skip,
          take: limit,
          include: {
            poster: {
              select: {
                id: true,
                name: true,
                image: true,
                reputationScore: true,
              },
            },
            collector: {
              select: {
                id: true,
                name: true,
                image: true,
                reputationScore: true,
              },
            },
            post: {
              select: {
                id: true,
                description: true,
                locationName: true,
                images: true,
              },
            },
          },
        }),
        prisma.transaction.count({ where }),
      ]);
      return { transactions, total };
    });

    return NextResponse.json({
      transactions: result.transactions,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (err) {
    console.error("[GET /api/v1/profile/transactions]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
