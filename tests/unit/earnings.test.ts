import { describe, it, expect } from "vitest";
import {
  RON_PER_BOTTLE,
  computeActualValue,
  roundToHalf,
  computeEarnings,
} from "@/lib/earnings";

describe("computeActualValue", () => {
  it("uses the fixed 0.5 RON SGR deposit per bottle", () => {
    expect(RON_PER_BOTTLE).toBe(0.5);
    expect(computeActualValue(10)).toBe(5);
    expect(computeActualValue(100)).toBe(50);
  });

  it("returns 0 for zero bottles", () => {
    expect(computeActualValue(0)).toBe(0);
  });
});

describe("roundToHalf", () => {
  it("rounds to the nearest 0.5 RON", () => {
    expect(roundToHalf(1.24)).toBe(1);
    expect(roundToHalf(1.25)).toBe(1.5);
    expect(roundToHalf(1.75)).toBe(2);
    expect(roundToHalf(2)).toBe(2);
  });
});

describe("computeEarnings", () => {
  it("splits value by the collector share", () => {
    // 100 bottles -> 50 RON total, 30% share -> 15 RON collector, 35 RON poster
    expect(computeEarnings(100, 30)).toEqual({
      actualValue: 50,
      collectorEarning: 15,
      posterEarning: 35,
    });
  });

  it("gives everything to the poster at 0%", () => {
    expect(computeEarnings(50, 0)).toEqual({
      actualValue: 25,
      collectorEarning: 0,
      posterEarning: 25,
    });
  });

  it("gives everything to the collector at 100%", () => {
    expect(computeEarnings(50, 100)).toEqual({
      actualValue: 25,
      collectorEarning: 25,
      posterEarning: 0,
    });
  });

  it("rounds the collector cut to 0.5 and gives the remainder to the poster", () => {
    // 10 bottles -> 5 RON, 30% = 1.5 exactly
    expect(computeEarnings(10, 30)).toEqual({
      actualValue: 5,
      collectorEarning: 1.5,
      posterEarning: 3.5,
    });

    // 7 bottles -> 3.5 RON, 30% = 1.05 -> rounds to 1.0, poster gets 2.5
    expect(computeEarnings(7, 30)).toEqual({
      actualValue: 3.5,
      collectorEarning: 1,
      posterEarning: 2.5,
    });

    // 3 bottles -> 1.5 RON, 50% = 0.75 -> rounds up to 1.0, poster gets 0.5
    expect(computeEarnings(3, 50)).toEqual({
      actualValue: 1.5,
      collectorEarning: 1,
      posterEarning: 0.5,
    });
  });

  it("always keeps collector + poster equal to the total", () => {
    for (let bottles = 1; bottles <= 200; bottles++) {
      for (const share of [0, 12, 30, 37, 50, 63, 88, 100]) {
        const { actualValue, collectorEarning, posterEarning } = computeEarnings(
          bottles,
          share,
        );
        expect(collectorEarning + posterEarning).toBeCloseTo(actualValue, 10);
        expect(collectorEarning).toBeGreaterThanOrEqual(0);
        expect(posterEarning).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
