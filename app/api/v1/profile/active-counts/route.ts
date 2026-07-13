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
    const now = new Date();
    const [post, collection] = await Promise.all([
      prisma.post.findFirst({
        // An OPEN post whose expiresAt has passed but which the expiry sweep
        // hasn't updated yet is NOT active — otherwise the header indicator
        // lingers for up to a sweep interval after expiry.
        where: {
          authorId: session.user.id,
          OR: [
            { status: { in: ["CLAIMED", "IN_PROGRESS"] } },
            {
              status: "OPEN",
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
          ],
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
