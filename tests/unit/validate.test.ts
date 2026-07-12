import { describe, it, expect } from "vitest";
import { isValidObjectId } from "@/lib/validate";
import { haversineKm } from "@/lib/radar";

describe("isValidObjectId", () => {
  it("accepts a 24-char hex string", () => {
    expect(isValidObjectId("507f1f77bcf86cd799439011")).toBe(true);
    expect(isValidObjectId("AABBCCDDEEFF001122334455")).toBe(true);
  });

  it("rejects wrong length, non-hex, and non-strings", () => {
    expect(isValidObjectId("507f1f77bcf86cd79943901")).toBe(false); // 23
    expect(isValidObjectId("507f1f77bcf86cd7994390111")).toBe(false); // 25
    expect(isValidObjectId("507f1f77bcf86cd79943901g")).toBe(false); // non-hex
    expect(isValidObjectId("")).toBe(false);
    expect(isValidObjectId(null)).toBe(false);
    expect(isValidObjectId(123)).toBe(false);
    expect(isValidObjectId(undefined)).toBe(false);
  });
});

describe("haversineKm", () => {
  it("is zero for identical points", () => {
    expect(haversineKm(44.4268, 26.1025, 44.4268, 26.1025)).toBe(0);
  });

  it("computes a known distance (Bucharest -> Cluj ~ 325km)", () => {
    const d = haversineKm(44.4268, 26.1025, 46.7712, 23.6236);
    expect(d).toBeGreaterThan(315);
    expect(d).toBeLessThan(335);
  });

  it("is symmetric", () => {
    const a = haversineKm(44.4, 26.1, 45.6, 25.5);
    const b = haversineKm(45.6, 25.5, 44.4, 26.1);
    expect(a).toBeCloseTo(b, 10);
  });
});
