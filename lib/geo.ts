/**
 * ~50m offset for viewers not entitled to a listing's exact address. Seeded
 * from the coordinates so the pin stays put instead of jittering per request.
 */
export function approximateCoords(
  lat: number,
  lng: number,
): { latitude: number; longitude: number } {
  let h = 5381;
  const seed = `${lat}${lng}`;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h) ^ seed.charCodeAt(i);
  h = Math.abs(h);

  const angle = (h % 628) / 100;
  const offsetMeters = 50;

  return {
    latitude: lat + (offsetMeters / 111320) * Math.sin(angle),
    longitude:
      lng +
      (offsetMeters / (111320 * Math.cos((lat * Math.PI) / 180))) *
        Math.cos(angle),
  };
}
