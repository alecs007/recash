import { NextResponse } from "next/server";
import { rateLimit, RL, getClientIp } from "@/lib/rate-limit";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const UA = "Recash/1.0 (contact@recash.ro)";

export async function GET(req: Request) {
  const rl = await rateLimit(`ip:geocode:${getClientIp(req)}`, RL.public);
  if (!rl.ok) return rl.response;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  try {
    if (type === "search") {
      const q = (searchParams.get("q") ?? "").trim().slice(0, 200);
      if (!q) return NextResponse.json([]);

      const res = await fetch(
        `${NOMINATIM}/search?q=${encodeURIComponent(q)}&format=json&limit=6&accept-language=ro&countrycodes=ro`,
        {
          headers: { "User-Agent": UA, "Accept-Language": "ro" },
          cache: "no-store",
        },
      );
      if (!res.ok) return NextResponse.json([]);
      return NextResponse.json(await res.json());
    }

    if (type === "reverse") {
      const lat = parseFloat(searchParams.get("lat") ?? "");
      const lon = parseFloat(searchParams.get("lon") ?? "");

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
      ) {
        return NextResponse.json(
          { error: "Coordonate invalide" },
          { status: 400 },
        );
      }

      const res = await fetch(
        `${NOMINATIM}/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ro`,
        {
          headers: { "User-Agent": UA, "Accept-Language": "ro" },
          cache: "no-store",
        },
      );
      if (!res.ok) return NextResponse.json({});
      return NextResponse.json(await res.json());
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (err) {
    console.error("[geocode]", err);
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}
