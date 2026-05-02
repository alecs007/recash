import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RL } from "@/lib/rate-limit";
import { reviewSchema } from "@/lib/validations/post";
import { notifyRatingReceived } from "@/lib/notifications";
import { invalidate, CacheKey } from "@/lib/cache";

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

    // Check if already reviewed
    if (isPoster && post.transaction.posterRating) {
      return NextResponse.json(
        { error: "Ai acordat deja un rating" },
        { status: 409 },
      );
    }
    if (isCollector && post.transaction.collectorRating) {
      return NextResponse.json(
        { error: "Ai acordat deja un rating" },
        { status: 409 },
      );
    }

    const reviewerName = isPoster
      ? (post.author.name ?? "Poster")
      : (post.collector?.name ?? "Colector");

    const reviewedUserId = isPoster ? post.collectorId! : post.authorId;

    // Update transaction and recalculate reputation in one go
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

      // Recalculate reputation score for reviewed user
      const allRatings = await tx.transaction.findMany({
        where: isPoster
          ? { collectorId: reviewedUserId, collectorRating: { not: null } }
          : { posterId: reviewedUserId, posterRating: { not: null } },
        select: isPoster ? { collectorRating: true } : { posterRating: true },
      });

      // Include the new rating
      const ratings = allRatings.map((r) =>
        isPoster
          ? r.collectorRating!
          : (r as { posterRating: number }).posterRating,
      );
      ratings.push(rating);

      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;

      await tx.user.update({
        where: { id: reviewedUserId },
        data: {
          reputationScore: Math.round(avg * 100) / 100,
          ratingCount: ratings.length,
        },
      });
    });

    // Check perfect rating badge (avg 5.0 after ≥10 ratings)
    const updatedUser = await prisma.user.findUnique({
      where: { id: reviewedUserId },
      select: { reputationScore: true, ratingCount: true },
    });
    if (
      updatedUser &&
      updatedUser.reputationScore === 5.0 &&
      updatedUser.ratingCount >= 10
    ) {
      await prisma.badge
        .create({ data: { userId: reviewedUserId, type: "PERFECT_RATING" } })
        .catch(() => null);
    }

    await notifyRatingReceived(reviewedUserId, rating, reviewerName);
    await invalidate(CacheKey.profile(reviewedUserId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/v1/posts/[id]/review]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
