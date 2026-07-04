import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { maybeExpirePost } from "@/lib/expiry";
import { rateLimit, RL, getClientIp } from "@/lib/rate-limit";
import { isValidObjectId } from "@/lib/validate";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  const rl = await rateLimit(
    session?.user?.id ? session.user.id : `ip:post-detail:${getClientIp(req)}`,
    session?.user?.id ? RL.read : RL.public,
  );
  if (!rl.ok) return rl.response;

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Anunț negăsit" }, { status: 404 });
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            certified: true,
            reputationScore: true,
            ratingCount: true,
            phone: true,
          },
        },
        collector: {
          select: {
            id: true,
            name: true,
            image: true,
            certified: true,
            reputationScore: true,
            ratingCount: true,
            phone: true,
          },
        },
        transaction: {
          select: {
            id: true,
            actualValue: true,
            collectorEarning: true,
            posterEarning: true,
            collectorRating: true,
            posterRating: true,
            collectorReview: true,
            posterReview: true,
            completedAt: true,
            posterRatedAt: true,
            collectorRatedAt: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Anunț negăsit" }, { status: 404 });
    }

    if (!post.author) {
      console.error(`Post ${id} is orphaned. No author found.`);
      return NextResponse.json(
        { error: "Datele autorului sunt corupte" },
        { status: 500 },
      );
    }

    if (post.status === "OPEN") {
      const didExpire = await maybeExpirePost(
        post.id,
        post.status,
        post.expiresAt,
      );
      if (didExpire) {
        const updated = { ...post, status: "EXPIRED" as const };
        return NextResponse.json({
          ...updated,
          author: { ...updated.author, phone: null },
          collector: null,
        });
      }
    }

    const userId = session?.user?.id;
    const isAuthor = userId === post.authorId;
    const isCollector = userId === post.collectorId;
    const isParticipant = isAuthor || isCollector;

    if (!isParticipant) {
      return NextResponse.json({
        ...post,
        author: { ...post.author, phone: null },
        collector: post.collector ? { ...post.collector, phone: null } : null,
      });
    }

    const showPhone = isParticipant && post.status === "IN_PROGRESS";
    return NextResponse.json({
      ...post,
      author: { ...post.author, phone: showPhone ? post.author?.phone : null },
      collector: post.collector
        ? { ...post.collector, phone: showPhone ? post.collector?.phone : null }
        : null,
      isAuthor,
      isCollector,
    });
  } catch (err) {
    console.error("[GET /api/v1/posts/[id]]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
