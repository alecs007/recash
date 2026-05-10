import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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

  try {
    const [post, collection] = await Promise.all([
      prisma.post.findFirst({
        where: {
          authorId: session.user.id,
          status: { in: ACTIVE_STATUSES },
        },
        select: { id: true },
      }),
      prisma.post.findFirst({
        where: {
          collectorId: session.user.id,
          status: { in: ACTIVE_STATUSES },
        },
        select: { id: true },
      }),
    ]);

    return NextResponse.json(
      {
        activePosts: post ? 1 : 0,
        activeCollections: collection ? 1 : 0,
        activePostId: post?.id || null,
        activeCollectionId: collection?.id || null,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=5",
        },
      },
    );
  } catch (err) {
    console.error("[GET /api/v1/profile/active-counts]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
