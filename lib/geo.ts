/**
 * Obfuscated pin for viewers not entitled to a listing's exact address. Both
 * the direction and the distance are seeded from the coordinates so the pin
 * stays put instead of jittering per request, while placing the true location
 * somewhere inside a ~150–350m disk — small enough to be useful on the map,
 * large enough that it does not pinpoint the poster's home.
 */
const MIN_OFFSET_METERS = 150;
const MAX_OFFSET_METERS = 350;

export function approximateCoords(
  lat: number,
  lng: number,
): { latitude: number; longitude: number } {
  let h = 5381;
  const seed = `${lat}${lng}`;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h) ^ seed.charCodeAt(i);
  h = Math.abs(h);

  const angle = (h % 628) / 100;
  // Second seed stream for the radius so distance and direction are independent.
  const radiusSeed = (Math.imul(h, 2654435761) >>> 0) % 1000;
  const offsetMeters =
    MIN_OFFSET_METERS +
    (radiusSeed / 1000) * (MAX_OFFSET_METERS - MIN_OFFSET_METERS);

  return {
    latitude: lat + (offsetMeters / 111320) * Math.sin(angle),
    longitude:
      lng +
      (offsetMeters / (111320 * Math.cos((lat * Math.PI) / 180))) *
        Math.cos(angle),
  };
}
