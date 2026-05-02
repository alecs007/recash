import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RL } from "@/lib/rate-limit";
import { invalidate, CacheKey } from "@/lib/cache";
import { checkRatingBadges } from "@/lib/badges";

// ─── POST /api/v1/ratings ─────────────────────────────────────────────────────
// Body: { transactionId: string; rating: 1 | 2 | 3 | 4 | 5 }
// Poster  → rates the collector  (writes collectorRating)
// Collector → rates the poster   (writes posterRating)

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.write);
  if (!rl.ok) return rl.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
  }

  const { transactionId, rating } = body as Record<string, unknown>;

  if (typeof transactionId !== "string" || transactionId.trim().length === 0) {
    return NextResponse.json(
      { error: "transactionId lipsă sau invalid" },
      { status: 400 },
    );
  }

  if (
    typeof rating !== "number" ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return NextResponse.json(
      { error: "Ratingul trebuie să fie un număr întreg între 1 și 5" },
      { status: 400 },
    );
  }

  try {
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        posterId: true,
        collectorId: true,
        collectorRating: true,
        posterRating: true,
      },
    });

    if (!tx) {
      return NextResponse.json(
        { error: "Tranzacție negăsită" },
        { status: 404 },
      );
    }

    const userId = session.user.id;
    const isPoster = tx.posterId === userId;
    const isCollector = tx.collectorId === userId;

    if (!isPoster && !isCollector) {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    // Determine which side is rating and who the target is
    let ratedUserId: string;

    if (isPoster) {
      if (tx.collectorRating !== null) {
        return NextResponse.json(
          { error: "Ai acordat deja un rating pentru această tranzacție" },
          { status: 409 },
        );
      }
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { collectorRating: rating, collectorRatedAt: new Date() },
      });
      ratedUserId = tx.collectorId;
    } else {
      // isCollector
      if (tx.posterRating !== null) {
        return NextResponse.json(
          { error: "Ai acordat deja un rating pentru această tranzacție" },
          { status: 409 },
        );
      }
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { posterRating: rating, posterRatedAt: new Date() },
      });
      ratedUserId = tx.posterId;
    }

    // Recalculate reputation for the rated user and check badges — non-blocking
    recalculateReputation(ratedUserId).catch((err) =>
      console.error("[ratings] recalculate error:", err),
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/v1/ratings]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function recalculateReputation(userId: string): Promise<void> {
  // Aggregate all ratings received as poster + as collector
  const [posterAgg, collectorAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { posterId: userId, posterRating: { not: null } },
      _avg: { posterRating: true },
      _count: { posterRating: true },
    }),
    prisma.transaction.aggregate({
      where: { collectorId: userId, collectorRating: { not: null } },
      _avg: { collectorRating: true },
      _count: { collectorRating: true },
    }),
  ]);

  const posterCount = posterAgg._count.posterRating ?? 0;
  const collectorCount = collectorAgg._count.collectorRating ?? 0;
  const totalCount = posterCount + collectorCount;

  if (totalCount === 0) return;

  const weightedSum =
    (posterAgg._avg.posterRating ?? 0) * posterCount +
    (collectorAgg._avg.collectorRating ?? 0) * collectorCount;

  const newScore = Math.round((weightedSum / totalCount) * 10) / 10;

  await prisma.user.update({
    where: { id: userId },
    data: { reputationScore: newScore, ratingCount: totalCount },
  });

  await Promise.all([
    invalidate(CacheKey.profile(userId)),
    checkRatingBadges(userId),
  ]);
}
