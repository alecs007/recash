import { describe, it, expect } from "vitest";
import {
  evaluatePostBadges,
  evaluatePosterTransactionBadges,
  evaluateCollectorTransactionBadges,
  isWithinSpeedWindow,
  qualifiesForPerfectRating,
} from "@/lib/badges";

describe("evaluatePostBadges", () => {
  it("awards nothing with no posts", () => {
    expect(evaluatePostBadges(0)).toEqual([]);
  });

  it("awards FIRST_POST at the first post", () => {
    expect(evaluatePostBadges(1)).toEqual(["FIRST_POST"]);
  });

  it("adds FIRST_WEEK only when eligible", () => {
    expect(evaluatePostBadges(1, true)).toEqual(["FIRST_POST", "FIRST_WEEK"]);
    expect(evaluatePostBadges(1, false)).toEqual(["FIRST_POST"]);
  });

  it("stacks veteran milestones cumulatively", () => {
    expect(evaluatePostBadges(10)).toEqual(["FIRST_POST", "POST_VETERAN_10"]);
    expect(evaluatePostBadges(50)).toEqual([
      "FIRST_POST",
      "POST_VETERAN_10",
      "POST_VETERAN_50",
    ]);
    expect(evaluatePostBadges(100)).toEqual([
      "FIRST_POST",
      "POST_VETERAN_10",
      "POST_VETERAN_50",
      "POST_VETERAN_100",
    ]);
  });

  it("does not award a milestone one below its threshold", () => {
    expect(evaluatePostBadges(9)).not.toContain("POST_VETERAN_10");
    expect(evaluatePostBadges(49)).not.toContain("POST_VETERAN_50");
  });
});

describe("evaluatePosterTransactionBadges", () => {
  it("awards eco badges by cumulative bottles", () => {
    expect(
      evaluatePosterTransactionBadges({
        txCount: 1,
        totalBottles: 50,
        isFirstWeekEligible: false,
      }),
    ).toEqual(["ECO_STARTER"]);

    expect(
      evaluatePosterTransactionBadges({
        txCount: 1,
        totalBottles: 5000,
        isFirstWeekEligible: false,
      }),
    ).toEqual(["ECO_STARTER", "ECO_WARRIOR", "ECO_CHAMPION", "ECO_LEGEND"]);
  });

  it("awards CENTURION at 100 poster transactions", () => {
    expect(
      evaluatePosterTransactionBadges({
        txCount: 100,
        totalBottles: 0,
        isFirstWeekEligible: false,
      }),
    ).toContain("CENTURION");
  });

  it("includes FIRST_WEEK only when eligible and with a transaction", () => {
    expect(
      evaluatePosterTransactionBadges({
        txCount: 1,
        totalBottles: 0,
        isFirstWeekEligible: true,
      }),
    ).toEqual(["FIRST_WEEK"]);

    expect(
      evaluatePosterTransactionBadges({
        txCount: 0,
        totalBottles: 0,
        isFirstWeekEligible: true,
      }),
    ).toEqual([]);
  });
});

describe("evaluateCollectorTransactionBadges", () => {
  it("awards the first collection", () => {
    expect(
      evaluateCollectorTransactionBadges({
        txCount: 1,
        totalBottles: 0,
        isFirstWeekEligible: false,
        completedWithinSpeedWindow: false,
      }),
    ).toEqual(["FIRST_COLLECTION"]);
  });

  it("stacks collector milestones and CENTURION at 100", () => {
    const badges = evaluateCollectorTransactionBadges({
      txCount: 100,
      totalBottles: 0,
      isFirstWeekEligible: false,
      completedWithinSpeedWindow: false,
    });
    expect(badges).toEqual([
      "FIRST_COLLECTION",
      "COLLECTOR_STARTER_10",
      "COLLECTOR_PRO_50",
      "COLLECTOR_ELITE_100",
      "CENTURION",
    ]);
  });

  it("adds SPEED_DEMON when completed inside the window", () => {
    expect(
      evaluateCollectorTransactionBadges({
        txCount: 1,
        totalBottles: 0,
        isFirstWeekEligible: false,
        completedWithinSpeedWindow: true,
      }),
    ).toContain("SPEED_DEMON");
  });
});

describe("isWithinSpeedWindow", () => {
  const now = new Date("2026-07-12T12:00:00.000Z");

  it("is false without a claim time", () => {
    expect(isWithinSpeedWindow(null, now)).toBe(false);
    expect(isWithinSpeedWindow(undefined, now)).toBe(false);
  });

  it("is true at exactly 30 minutes and false just after", () => {
    expect(
      isWithinSpeedWindow(new Date(now.getTime() - 30 * 60 * 1000), now),
    ).toBe(true);
    expect(
      isWithinSpeedWindow(new Date(now.getTime() - 30 * 60 * 1000 - 1), now),
    ).toBe(false);
  });

  it("is true for a recent claim", () => {
    expect(
      isWithinSpeedWindow(new Date(now.getTime() - 5 * 60 * 1000), now),
    ).toBe(true);
  });
});

describe("qualifiesForPerfectRating", () => {
  it("requires at least 10 ratings and a 5.0 average", () => {
    expect(qualifiesForPerfectRating(10, 5)).toBe(true);
    expect(qualifiesForPerfectRating(9, 5)).toBe(false);
    expect(qualifiesForPerfectRating(20, 4.9)).toBe(false);
  });
});
