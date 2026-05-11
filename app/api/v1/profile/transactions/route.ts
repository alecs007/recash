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
  const side = searchParams.get("side") ?? "all";

  const where =
    side === "poster"
      ? { posterId: session.user.id }
      : side === "collector"
        ? { collectorId: session.user.id }
        : {
            OR: [
              { posterId: session.user.id },
              { collectorId: session.user.id },
            ],
          };

  const cacheKey = CacheKey.transactions(session.user.id, page, limit, side);

  try {
    const result = await cached(cacheKey, TTL.transactions, async () => {
      const [rawTransactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          orderBy: { completedAt: "desc" },
          skip: 0,
          take: 1000,
          select: {
            id: true,
            bottleCount: true,
            actualValue: true,
            collectorEarning: true,
            posterEarning: true,
            collectorRating: true,
            posterRating: true,
            completedAt: true,
            posterId: true,
            postId: true,
            poster: {
              select: { id: true, name: true, image: true },
            },
            collector: {
              select: { id: true, name: true, image: true },
            },
          },
        }),
        prisma.transaction.count({ where }),
      ]);

      if (rawTransactions.length === 0) {
        return { transactions: [], total: 0 };
      }

      const postIds = [...new Set(rawTransactions.map((t) => t.postId))];
      const existingPosts = await prisma.post.findMany({
        where: { id: { in: postIds } },
        select: {
          id: true,
          description: true,
          locationName: true,
          images: true,
        },
      });

      const postMap = new Map(existingPosts.map((p) => [p.id, p]));

      const validTransactions = rawTransactions
        .filter((t) => postMap.has(t.postId))
        .map((t) => ({
          ...t,
          post: postMap.get(t.postId)!,
        }));

      const paginated = validTransactions.slice(
        (page - 1) * limit,
        (page - 1) * limit + limit,
      );

      const adjustedTotal = Math.min(total, validTransactions.length);

      return { transactions: paginated, total: adjustedTotal };
    });

    return NextResponse.json({
      transactions: result.transactions,
      total: result.total,
      page,
      totalPages: Math.max(1, Math.ceil(result.total / limit)),
    });
  } catch (err) {
    console.error("[GET /api/v1/profile/transactions]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
