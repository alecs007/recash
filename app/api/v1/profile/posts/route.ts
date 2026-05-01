import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PostStatus } from "@prisma/client";

const ACTIVE_STATUSES: PostStatus[] = ["OPEN", "CLAIMED", "IN_PROGRESS"];

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") ?? "10")),
    );
    const status = searchParams.get("status");
    const skip = (page - 1) * limit;

    let statusFilter = {};
    if (status === "active") {
      statusFilter = { status: { in: ACTIVE_STATUSES } };
    } else if (status) {
      statusFilter = { status: status as PostStatus };
    }

    const where = {
      authorId: session.user.id,
      ...statusFilter,
    };

    if (status === "active") {
      const ORDER: Record<PostStatus, number> = {
        OPEN: 0,
        CLAIMED: 1,
        IN_PROGRESS: 2,
        COMPLETED: 3,
        CANCELLED: 4,
        EXPIRED: 5,
      };

      const [allActive, total] = await Promise.all([
        prisma.post.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 200,
          include: {
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
          },
        }),
        prisma.post.count({ where }),
      ]);

      allActive.sort((a, b) => {
        const diff =
          (ORDER[a.status as PostStatus] ?? 99) -
          (ORDER[b.status as PostStatus] ?? 99);
        if (diff !== 0) return diff;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      const posts = allActive.slice(skip, skip + limit);

      return NextResponse.json({
        posts,
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
        include: {
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
    console.error("[GET /api/v1/profile/posts]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
