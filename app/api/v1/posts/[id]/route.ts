import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { maybeExpirePost } from "@/lib/expiry";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
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

    // Sanitize sensitive fields for non-participants
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
