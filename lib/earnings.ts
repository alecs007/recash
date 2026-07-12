export const RON_PER_BOTTLE = 0.5;
export const SGR_VALUE_PER_BOTTLE = RON_PER_BOTTLE;

export interface Earnings {
  actualValue: number;
  collectorEarning: number;
  posterEarning: number;
}

export function computeActualValue(bottleCount: number): number {
  return bottleCount * RON_PER_BOTTLE;
}

/** Round to the nearest 0.5 RON (real-world coin granularity). */
export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export function computeEarnings(
  bottleCount: number,
  collectorSharePercent: number,
): Earnings {
  const actualValue = computeActualValue(bottleCount);
  const collectorEarning = roundToHalf(
    (actualValue * collectorSharePercent) / 100,
  );
  const posterEarning = actualValue - collectorEarning;
  return { actualValue, collectorEarning, posterEarning };
}
