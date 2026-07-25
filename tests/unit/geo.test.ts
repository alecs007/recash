import { describe, it, expect } from "vitest";
import { approximateCoords } from "@/lib/geo";

const LAT = 44.4268;
const LNG = 26.1025;

describe("approximateCoords", () => {
  it("never returns the exact coordinates", () => {
    const a = approximateCoords(LAT, LNG);
    expect(a.latitude).not.toBe(LAT);
    expect(a.longitude).not.toBe(LNG);
  });

  it("is deterministic so the pin doesn't jitter between requests", () => {
    expect(approximateCoords(LAT, LNG)).toEqual(approximateCoords(LAT, LNG));
  });

  it("obfuscates within a ~150–350m disk: far enough to hide the home, close enough to stay useful", () => {
    const a = approximateCoords(LAT, LNG);
    const dLat = (a.latitude - LAT) * 111_320;
    const dLng =
      (a.longitude - LNG) * 111_320 * Math.cos((LAT * Math.PI) / 180);
    const meters = Math.sqrt(dLat * dLat + dLng * dLng);
    expect(meters).toBeGreaterThan(140);
    expect(meters).toBeLessThan(360);
  });

  it("gives different offsets for different listings", () => {
    const a = approximateCoords(LAT, LNG);
    const b = approximateCoords(45.7489, 21.2087);
    expect(a).not.toEqual(b);
  });
});
