// app/api/v1/profile/posts/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PostStatus } from "@prisma/client";

const VALID_STATUSES = new Set<PostStatus>([
  "OPEN",
  "CLAIMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
]);

const STATUS_ORDER: Record<PostStatus, number> = {
  OPEN: 0,
  CLAIMED: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  CANCELLED: 4,
  EXPIRED: 5,
};

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

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
    // Any unknown value is ignored — returns all statuses

    const where = { authorId: session.user.id, ...statusFilter };

    const postSelect = {
      collector: { select: { id: true, name: true, image: true } },
      transaction: {
        select: {
          actualValue: true,
          collectorEarning: true,
          posterEarning: true,
          collectorRating: true,
          posterRating: true,
        },
      },
    };

    // For "active" we fetch all matching, sort by status priority, then paginate in-memory
    // (active set is always small — at most a few dozen per user)
    if (statusParam === "active") {
      const [allActive, total] = await Promise.all([
        prisma.post.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 200, // safety cap
          include: postSelect,
        }),
        prisma.post.count({ where }),
      ]);

      allActive.sort((a, b) => {
        const diff =
          (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
        return diff !== 0
          ? diff
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return NextResponse.json({
        posts: allActive.slice(skip, skip + limit),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: postSelect,
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
    console.error("[GET /api/v1/profile/posts]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
