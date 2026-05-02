import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RL } from "@/lib/rate-limit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.read);
  if (!rl.ok) return rl.response;

  try {
    const [activePost, activeCollection] = await Promise.all([
      prisma.post.findFirst({
        where: {
          authorId: session.user.id,
          status: { in: ["OPEN", "CLAIMED", "IN_PROGRESS"] },
        },
        select: {
          id: true,
          status: true,
          bottleCount: true,
          locationName: true,
          createdAt: true,
          claimedAt: true,
          collector: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.post.findFirst({
        where: {
          collectorId: session.user.id,
          status: { in: ["CLAIMED", "IN_PROGRESS"] },
        },
        select: {
          id: true,
          status: true,
          bottleCount: true,
          locationName: true,
          claimedAt: true,
          author: { select: { id: true, name: true, image: true } },
        },
        orderBy: { claimedAt: "desc" },
      }),
    ]);

    return NextResponse.json({ activePost, activeCollection });
  } catch (err) {
    console.error("[GET /api/v1/posts/active]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
