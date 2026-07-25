import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PostStatus } from "@prisma/client";
import { cached, CacheKey, TTL, getCacheVersion } from "@/lib/cache";
import { rateLimit, RL } from "@/lib/rate-limit";

const VALID_STATUSES = new Set<PostStatus>([
  "OPEN",
  "CLAIMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
]);

function withPendingCount<T extends { _count: { claimRequests: number } }>({
  _count,
  ...post
}: T) {
  return { ...post, pendingRequestCount: _count.claimRequests };
}

const STATUS_ORDER: Record<PostStatus, number> = {
  OPEN: 0,
  CLAIMED: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  CANCELLED: 4,
  EXPIRED: 5,
};

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
  const statusParam = searchParams.get("status") ?? "";
  const skip = (page - 1) * limit;

  let statusFilter: object = {};
  if (statusParam === "active") {
    statusFilter = {
      status: { in: ["OPEN", "CLAIMED", "IN_PROGRESS"] as PostStatus[] },
    };
  } else if (statusParam && VALID_STATUSES.has(statusParam as PostStatus)) {
    statusFilter = { status: statusParam as PostStatus };
  }

  const where = { authorId: session.user.id, ...statusFilter };
  const version = await getCacheVersion(session.user.id, "posts");
  const cacheKey = CacheKey.posts(
    session.user.id,
    statusParam || "all",
    page || 1,
    limit || 10,
    version,
  );

  try {
    if (statusParam === "active") {
      const result = await cached(cacheKey, TTL.posts, async () => {
        const [all, total] = await Promise.all([
          prisma.post.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 200,
            include: {
              collector: { select: { id: true, name: true, image: true } },
              claimRequests: {
                where: { status: "PENDING" },
                orderBy: { createdAt: "asc" },
                take: 4,
                select: {
                  collector: { select: { id: true, name: true, image: true } },
                },
              },
              _count: {
                select: { claimRequests: { where: { status: "PENDING" } } },
              },
              transaction: {
                select: {
                  posterEarning: true,
                },
              },
            },
          }),
          prisma.post.count({ where }),
        ]);

        all.sort((a, b) => {
          const diff =
            (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
          return diff !== 0
            ? diff
            : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return { sorted: all, total };
      });

      return NextResponse.json({
        posts: result.sorted.slice(skip, skip + limit).map(withPendingCount),
        total: result.total,
        page,
        totalPages: Math.ceil(result.total / limit),
      });
    }

    const result = await cached(cacheKey, TTL.posts, async () => {
      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            collector: { select: { id: true, name: true, image: true } },
            claimRequests: {
              where: { status: "PENDING" },
              orderBy: { createdAt: "asc" },
              take: 4,
              select: {
                collector: { select: { id: true, name: true, image: true } },
              },
            },
            _count: {
              select: { claimRequests: { where: { status: "PENDING" } } },
            },
            transaction: {
              select: {
                posterEarning: true,
              },
            },
          },
        }),
        prisma.post.count({ where }),
      ]);
      return { posts, total };
    });

    return NextResponse.json({
      posts: result.posts.map(withPendingCount),
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (err) {
    console.error("[GET /api/v1/profile/posts]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
