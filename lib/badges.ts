import { prisma } from "./prisma";
import { BadgeType } from "@prisma/client";
import { invalidate, CacheKey } from "./cache";

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

// ─── Pure badge-threshold logic ───────────────────────────────────────────────
// These functions decide *which* badges a user qualifies for given already
// fetched counts. They perform no I/O so they can be unit-tested directly; the
// async `check*` functions below fetch the counts and delegate here.

const ECO_THRESHOLDS: ReadonlyArray<readonly [number, BadgeType]> = [
  [50, "ECO_STARTER"],
  [250, "ECO_WARRIOR"],
  [1000, "ECO_CHAMPION"],
  [5000, "ECO_LEGEND"],
];

/** Milestones based on how many posts a user has authored. */
export function evaluatePostBadges(
  postCount: number,
  isFirstWeekEligible = false,
): BadgeType[] {
  const badges: BadgeType[] = [];
  if (postCount >= 1) {
    badges.push("FIRST_POST");
    if (isFirstWeekEligible) badges.push("FIRST_WEEK");
  }
  if (postCount >= 10) badges.push("POST_VETERAN_10");
  if (postCount >= 50) badges.push("POST_VETERAN_50");
  if (postCount >= 100) badges.push("POST_VETERAN_100");
  return badges;
}

/** Eco badges earned by cumulative bottle throughput (given + collected). */
function evaluateEcoBadges(totalBottles: number): BadgeType[] {
  return ECO_THRESHOLDS.filter(([min]) => totalBottles >= min).map(
    ([, badge]) => badge,
  );
}

/** Poster-side badges awarded when one of their posts is completed. */
export function evaluatePosterTransactionBadges(opts: {
  txCount: number;
  totalBottles: number;
  isFirstWeekEligible: boolean;
}): BadgeType[] {
  const badges: BadgeType[] = [];
  if (opts.txCount >= 1 && opts.isFirstWeekEligible) badges.push("FIRST_WEEK");
  if (opts.txCount >= 100) badges.push("CENTURION");
  badges.push(...evaluateEcoBadges(opts.totalBottles));
  return badges;
}

/** Collector-side badges awarded when they complete a collection. */
export function evaluateCollectorTransactionBadges(opts: {
  txCount: number;
  totalBottles: number;
  isFirstWeekEligible: boolean;
  completedWithinSpeedWindow: boolean;
}): BadgeType[] {
  const badges: BadgeType[] = [];
  if (opts.txCount >= 1 && opts.isFirstWeekEligible) badges.push("FIRST_WEEK");
  if (opts.txCount >= 1) badges.push("FIRST_COLLECTION");
  if (opts.txCount >= 10) badges.push("COLLECTOR_STARTER_10");
  if (opts.txCount >= 50) badges.push("COLLECTOR_PRO_50");
  if (opts.txCount >= 100) {
    badges.push("COLLECTOR_ELITE_100");
    badges.push("CENTURION");
  }
  badges.push(...evaluateEcoBadges(opts.totalBottles));
  if (opts.completedWithinSpeedWindow) badges.push("SPEED_DEMON");
  return badges;
}

/** SPEED_DEMON window: completed within 30 minutes of being claimed. */
export function isWithinSpeedWindow(
  claimedAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!claimedAt) return false;
  return now.getTime() - claimedAt.getTime() <= 30 * 60 * 1000;
}

/** PERFECT_RATING: at least 10 ratings and a flawless 5.0 average. */
export function qualifiesForPerfectRating(
  ratingCount: number,
  reputationScore: number,
): boolean {
  return ratingCount >= 10 && reputationScore >= 5.0;
}

// ─── I/O wrappers ─────────────────────────────────────────────────────────────

export async function awardBadge(
  userId: string,
  type: BadgeType,
): Promise<boolean> {
  try {
    // Check first, avoids a write on the common already has badge path
    const existing = await prisma.badge.findUnique({
      where: { userId_type: { userId, type } },
      select: { id: true },
    });
    if (existing) return false;

    // Create if a concurrent request beat us, the unique index will throw
    await prisma.badge.create({ data: { userId, type } });

    // Only fires for brand-new badges
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
    const code = (err as { code?: string }).code;
    const meta = (err as { meta?: { message?: string } }).meta;
    const isDuplicate =
      code === "P2002" ||
      (meta?.message ?? "").includes("duplicate key") ||
      (meta?.message ?? "").includes("E11000");

    if (isDuplicate) return false;
    throw err;
  }
}

export async function checkPostBadges(userId: string): Promise<void> {
  const count = await prisma.post.count({ where: { authorId: userId } });
  const isFirstWeekEligible =
    count >= 1 ? await checkFirstWeekEligibility(userId) : false;

  const candidates = evaluatePostBadges(count, isFirstWeekEligible);

  await Promise.all(candidates.map((t) => awardBadge(userId, t)));
}

export async function checkTransactionBadges(
  posterId: string,
  collectorId: string,
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

  const [posterFirstWeek, collectorFirstWeek] = await Promise.all([
    posterTxCount >= 1 ? checkFirstWeekEligibility(posterId) : false,
    collectorTxCount >= 1 ? checkFirstWeekEligibility(collectorId) : false,
  ]);

  const posterCandidates = evaluatePosterTransactionBadges({
    txCount: posterTxCount,
    totalBottles: posterBottles,
    isFirstWeekEligible: posterFirstWeek,
  });

  const collectorCandidates = evaluateCollectorTransactionBadges({
    txCount: collectorTxCount,
    totalBottles: collectorBottles,
    isFirstWeekEligible: collectorFirstWeek,
    completedWithinSpeedWindow: isWithinSpeedWindow(claimedAt),
  });

  await Promise.all([
    ...posterCandidates.map((t) => awardBadge(posterId, t)),
    ...collectorCandidates.map((t) => awardBadge(collectorId, t)),
  ]);
}

export async function checkRatingBadges(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { reputationScore: true, ratingCount: true },
  });

  if (user && qualifiesForPerfectRating(user.ratingCount, user.reputationScore)) {
    await awardBadge(userId, "PERFECT_RATING");
  }
}

async function checkFirstWeekEligibility(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });

  if (!user) return false;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  return user.createdAt >= oneWeekAgo;
}
