import { prisma } from "./prisma";
import { BadgeType } from "@prisma/client";
import { invalidate, CacheKey } from "./cache";

// ─── Label map (kept in sync with BADGE_CONFIG in the UI) ────────────────────

const BADGE_LABELS: Record<BadgeType, string> = {
  FIRST_POST: "Prima Postare",
  POST_VETERAN_10: "10 Postări",
  POST_VETERAN_50: "50 Postări",
  POST_VETERAN_100: "100 Postări",
  FIRST_COLLECTION: "Prima Colectare",
  COLLECTOR_STARTER_10: "10 Colectări",
  COLLECTOR_PRO_50: "50 Colectări",
  COLLECTOR_ELITE_100: "100 Colectări",
  ECO_STARTER: "Eco Starter",
  ECO_WARRIOR: "Eco Warrior",
  ECO_CHAMPION: "Eco Champion",
  ECO_LEGEND: "Eco Legend",
  SPEED_DEMON: "Speed Demon",
  FIRST_WEEK: "Prima Săptămână",
  MONTHLY_ACTIVE: "Activ Lunar",
  VETERAN_1_YEAR: "Veteran 1 An",
  CENTURION: "Centurion",
  PERFECT_RATING: "Rating Perfect",
};

// ─── Core primitive ───────────────────────────────────────────────────────────

/**
 * Awards a badge. Completely idempotent — safe to call any number of times.
 * Returns `true` only when the badge was *newly* created.
 * Fires a notification and invalidates the badge cache on first award.
 */
export async function awardBadge(
  userId: string,
  type: BadgeType,
): Promise<boolean> {
  try {
    // 1. Attempt to create the badge record.
    // Because of @@unique([userId, type]) in schema.prisma,
    // this will FAIL if the user already has this badge.
    await prisma.badge.create({
      data: { userId, type },
    });

    // 2. If we reached this line, the badge is brand NEW.
    // We fire side effects only for the first-time award.
    await Promise.all([
      prisma.notification.create({
        data: {
          userId,
          type: "BADGE_EARNED",
          title: "Badge nou obținut! 🏆",
          message: `Felicitări! Ai obținut badge-ul „${BADGE_LABELS[type]}".`,
          link: "/profil/badges",
        },
      }),
      invalidate(CacheKey.badges(userId)),
    ]);

    return true;
  } catch (err) {
    // P2002 = MongoDB unique constraint violation.
    // This means the user already has the badge; we return false silently.
    if ((err as { code?: string }).code === "P2002") {
      return false;
    }

    // For any other error (DB connection, etc.), throw it.
    throw err;
  }
}

// ─── Event: post created ──────────────────────────────────────────────────────

export async function checkPostBadges(userId: string): Promise<void> {
  const count = await prisma.post.count({ where: { authorId: userId } });

  const candidates: BadgeType[] = [];
  if (count >= 1) candidates.push("FIRST_POST");
  if (count >= 10) candidates.push("POST_VETERAN_10");
  if (count >= 50) candidates.push("POST_VETERAN_50");
  if (count >= 100) candidates.push("POST_VETERAN_100");

  await Promise.all(candidates.map((t) => awardBadge(userId, t)));
}

// ─── Event: transaction completed ────────────────────────────────────────────

export async function checkTransactionBadges(
  posterId: string,
  collectorId: string,
  /** Pass claimedAt if available to check SPEED_DEMON */
  claimedAt?: Date | null,
): Promise<void> {
  const [posterTxCount, collectorTxCount, posterUser, collectorUser] =
    await Promise.all([
      prisma.transaction.count({ where: { posterId } }),
      prisma.transaction.count({ where: { collectorId } }),
      prisma.user.findUnique({
        where: { id: posterId },
        select: { totalBottlesGiven: true, totalBottlesCollected: true },
      }),
      prisma.user.findUnique({
        where: { id: collectorId },
        select: { totalBottlesGiven: true, totalBottlesCollected: true },
      }),
    ]);

  const posterBottles =
    (posterUser?.totalBottlesGiven ?? 0) +
    (posterUser?.totalBottlesCollected ?? 0);
  const collectorBottles =
    (collectorUser?.totalBottlesGiven ?? 0) +
    (collectorUser?.totalBottlesCollected ?? 0);

  const posterCandidates: BadgeType[] = [];
  const collectorCandidates: BadgeType[] = [];

  // Poster-side badges
  if (posterTxCount >= 100) posterCandidates.push("CENTURION");
  if (posterBottles >= 50) posterCandidates.push("ECO_STARTER");
  if (posterBottles >= 250) posterCandidates.push("ECO_WARRIOR");
  if (posterBottles >= 1000) posterCandidates.push("ECO_CHAMPION");
  if (posterBottles >= 5000) posterCandidates.push("ECO_LEGEND");

  // Collector-side badges
  if (collectorTxCount >= 1) collectorCandidates.push("FIRST_COLLECTION");
  if (collectorTxCount >= 10) collectorCandidates.push("COLLECTOR_STARTER_10");
  if (collectorTxCount >= 50) collectorCandidates.push("COLLECTOR_PRO_50");
  if (collectorTxCount >= 100) {
    collectorCandidates.push("COLLECTOR_ELITE_100");
    collectorCandidates.push("CENTURION");
  }
  if (collectorBottles >= 50) collectorCandidates.push("ECO_STARTER");
  if (collectorBottles >= 250) collectorCandidates.push("ECO_WARRIOR");
  if (collectorBottles >= 1000) collectorCandidates.push("ECO_CHAMPION");
  if (collectorBottles >= 5000) collectorCandidates.push("ECO_LEGEND");

  // SPEED_DEMON: completed within 30 minutes of being claimed
  if (claimedAt) {
    const elapsedMs = Date.now() - claimedAt.getTime();
    if (elapsedMs <= 30 * 60 * 1000) {
      collectorCandidates.push("SPEED_DEMON");
    }
  }

  await Promise.all([
    ...posterCandidates.map((t) => awardBadge(posterId, t)),
    ...collectorCandidates.map((t) => awardBadge(collectorId, t)),
  ]);
}

// ─── Event: rating submitted ──────────────────────────────────────────────────

export async function checkRatingBadges(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { reputationScore: true, ratingCount: true },
  });

  if (user && user.ratingCount >= 10 && user.reputationScore >= 5.0) {
    await awardBadge(userId, "PERFECT_RATING");
  }
}
