import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RL } from "@/lib/rate-limit";
import { reviewSchema } from "@/lib/validations/post";
import { notifyRatingReceived } from "@/lib/notifications";
import { invalidate, CacheKey } from "@/lib/cache";
import { awardBadge } from "@/lib/badges";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.write);
  if (!rl.ok) return rl.response;

  const { id: postId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Date invalide", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { rating, review } = parsed.data;

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        transaction: true,
        author: { select: { id: true, name: true } },
        collector: { select: { id: true, name: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Anunț negăsit" }, { status: 404 });
    }

    if (post.status !== "COMPLETED" || !post.transaction) {
      return NextResponse.json(
        { error: "Recenziile sunt disponibile doar după finalizare" },
        { status: 409 },
      );
    }

    const isPoster = post.authorId === session.user.id;
    const isCollector = post.collectorId === session.user.id;

    if (!isPoster && !isCollector) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    if (isPoster && post.transaction.posterRating !== null) {
      return NextResponse.json(
        { error: "Ai acordat deja un rating" },
        { status: 409 },
      );
    }
    if (isCollector && post.transaction.collectorRating !== null) {
      return NextResponse.json(
        { error: "Ai acordat deja un rating" },
        { status: 409 },
      );
    }

    const reviewerName = isPoster
      ? (post.author.name ?? "Poster")
      : (post.collector?.name ?? "Colector");

    const reviewedUserId = isPoster ? post.collectorId! : post.authorId;

    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: post.transaction!.id },
        data: isPoster
          ? {
              posterRating: rating,
              posterReview: review ?? null,
              posterRatedAt: new Date(),
            }
          : {
              collectorRating: rating,
              collectorReview: review ?? null,
              collectorRatedAt: new Date(),
            },
      });

      const [posterAgg, collectorAgg] = await Promise.all([
        tx.transaction.aggregate({
          where: { posterId: reviewedUserId, posterRating: { not: null } },
          _avg: { posterRating: true },
          _count: { posterRating: true },
        }),
        tx.transaction.aggregate({
          where: {
            collectorId: reviewedUserId,
            collectorRating: { not: null },
          },
          _avg: { collectorRating: true },
          _count: { collectorRating: true },
        }),
      ]);

      const posterCount = posterAgg._count.posterRating ?? 0;
      const collectorCount = collectorAgg._count.collectorRating ?? 0;
      const totalCount = posterCount + collectorCount;

      if (totalCount > 0) {
        const weightedSum =
          (posterAgg._avg.posterRating ?? 0) * posterCount +
          (collectorAgg._avg.collectorRating ?? 0) * collectorCount;
        const newScore = Math.round((weightedSum / totalCount) * 100) / 100;

        await tx.user.update({
          where: { id: reviewedUserId },
          data: { reputationScore: newScore, ratingCount: totalCount },
        });
      }
    });

    const sideEffects: Promise<unknown>[] = [
      notifyRatingReceived(reviewedUserId, rating, reviewerName),
      invalidate(CacheKey.profile(reviewedUserId)),
    ];

    // Check PERFECT_RATING badge after score is persisted
    sideEffects.push(
      prisma.user
        .findUnique({
          where: { id: reviewedUserId },
          select: { reputationScore: true, ratingCount: true },
        })
        .then((u) => {
          if (u && u.ratingCount >= 10 && u.reputationScore >= 5.0) {
            return awardBadge(reviewedUserId, "PERFECT_RATING");
          }
        }),
    );

    await Promise.all(sideEffects).catch((err) =>
      console.error("[review] side-effect error:", err),
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/v1/posts/[id]/review]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
