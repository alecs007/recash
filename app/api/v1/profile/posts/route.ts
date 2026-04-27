import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "10");
    const status = searchParams.get("status") ?? undefined;
    const skip = (page - 1) * limit;

    const where = {
      authorId: session.user.id,
      ...(status && { status: status as any }),
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          collector: {
            select: {
              id: true,
              name: true,
              image: true,
              reputationScore: true,
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
