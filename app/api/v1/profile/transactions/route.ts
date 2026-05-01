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
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") ?? "10") || 10),
    );
    const skip = (page - 1) * limit;

    const where = {
      OR: [{ posterId: session.user.id }, { collectorId: session.user.id }],
    };

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

    return NextResponse.json({
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[GET /api/v1/profile/transactions]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
