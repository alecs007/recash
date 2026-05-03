import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/cache";
import { rateLimit, RL } from "@/lib/rate-limit";
import { PostStatus } from "@prisma/client";

const ACTIVE_STATUSES: PostStatus[] = ["OPEN", "CLAIMED", "IN_PROGRESS"];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.read);
  if (!rl.ok) return rl.response;

  const cacheKey = `profile:${session.user.id}:active-counts`;

  try {
    const result = await cached(cacheKey, 30, async () => {
      const [activePosts, activeCollections] = await Promise.all([
        // Posts I created that are still active
        prisma.post.count({
          where: {
            authorId: session.user.id,
            status: { in: ACTIVE_STATUSES },
          },
        }),
        // Posts I claimed as collector that are still active
        prisma.post.count({
          where: {
            collectorId: session.user.id,
            status: { in: ACTIVE_STATUSES },
          },
        }),
      ]);
      return { activePosts, activeCollections };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/v1/profile/active-counts]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
