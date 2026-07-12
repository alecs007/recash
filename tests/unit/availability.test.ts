import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isCurrentlyAvailable,
  getNextAvailableText,
  type DaySchedule,
} from "@/lib/availability";

// The schedule clock is evaluated in Europe/Bucharest. July is EEST (UTC+3),
// so a UTC instant maps to Bucharest time by adding 3 hours.
// 2026-07-13 is a Monday (weekday index 1).
const MONDAY = 1;
const TUESDAY = 2;

function setBucharest(utc: string) {
  vi.setSystemTime(new Date(utc));
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("isCurrentlyAvailable", () => {
  it("is always available with no schedule", () => {
    setBucharest("2026-07-13T09:00:00Z");
    expect(isCurrentlyAvailable(null)).toBe(true);
    expect(isCurrentlyAvailable(undefined)).toBe(true);
    expect(isCurrentlyAvailable([])).toBe(true);
  });

  it("is available inside today's window", () => {
    // Bucharest Monday 12:00
    setBucharest("2026-07-13T09:00:00Z");
    const schedule: DaySchedule[] = [
      { day: MONDAY, start: "10:00", end: "14:00" },
    ];
    expect(isCurrentlyAvailable(schedule)).toBe(true);
  });

  it("is unavailable outside today's window", () => {
    // Bucharest Monday 15:00
    setBucharest("2026-07-13T12:00:00Z");
    const schedule: DaySchedule[] = [
      { day: MONDAY, start: "10:00", end: "14:00" },
    ];
    expect(isCurrentlyAvailable(schedule)).toBe(false);
  });

  it("is unavailable on a day that has no window", () => {
    // Bucharest Monday 12:00, but schedule only covers Tuesday
    setBucharest("2026-07-13T09:00:00Z");
    const schedule: DaySchedule[] = [
      { day: TUESDAY, start: "10:00", end: "14:00" },
    ];
    expect(isCurrentlyAvailable(schedule)).toBe(false);
  });

  it("treats window edges as inclusive", () => {
    const schedule: DaySchedule[] = [
      { day: MONDAY, start: "12:00", end: "12:00" },
    ];
    setBucharest("2026-07-13T09:00:00Z"); // Bucharest 12:00
    expect(isCurrentlyAvailable(schedule)).toBe(true);
  });
});

describe("getNextAvailableText", () => {
  it("returns null with no schedule", () => {
    setBucharest("2026-07-13T09:00:00Z");
    expect(getNextAvailableText(null)).toBeNull();
  });

  it("points to later today when the window has not started", () => {
    // Bucharest Monday 08:00, window opens at 10:00
    setBucharest("2026-07-13T05:00:00Z");
    const schedule: DaySchedule[] = [
      { day: MONDAY, start: "10:00", end: "14:00" },
    ];
    expect(getNextAvailableText(schedule)).toBe("azi la 10:00");
  });

  it("points to tomorrow when today's window has passed", () => {
    // Bucharest Monday 15:00, next window is Tuesday
    setBucharest("2026-07-13T12:00:00Z");
    const schedule: DaySchedule[] = [
      { day: TUESDAY, start: "09:00", end: "12:00" },
    ];
    expect(getNextAvailableText(schedule)).toBe("mâine la 09:00");
  });
});
