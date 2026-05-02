import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
            // Only expose phone to the assigned collector or the author
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

    const userId = session?.user?.id;
    const isAuthor = userId === post.authorId;
    const isCollector = userId === post.collectorId;
    const isParticipant = isAuthor || isCollector;

    // Sanitize sensitive fields for non-participants
    if (!isParticipant) {
      return NextResponse.json({
        ...post,
        author: {
          ...post.author,
          phone: null, // hide phone from strangers
        },
        collector: post.collector ? { ...post.collector, phone: null } : null,
      });
    }

    return NextResponse.json({ ...post, isAuthor, isCollector });
  } catch (err) {
    console.error("[GET /api/v1/posts/[id]]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
