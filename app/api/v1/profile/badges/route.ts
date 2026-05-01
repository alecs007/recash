import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    const badges = await prisma.badge.findMany({
      where: { userId: session.user.id },
      orderBy: { earnedAt: "desc" },
      select: {
        id: true,
        type: true,
        earnedAt: true,
        seen: true,
      },
    });

    const hasUnseen = badges.some((b) => !b.seen);
    if (hasUnseen) {
      prisma.badge
        .updateMany({
          where: { userId: session.user.id, seen: false },
          data: { seen: true },
        })
        .catch((err) => console.error("[badges seen update]", err));
    }

    return NextResponse.json(badges);
  } catch (err) {
    console.error("[GET /api/v1/profile/badges]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
