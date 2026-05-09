import { NextResponse } from "next/server";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const UA = "Recash/1.0 (contact@recash.ro)";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  try {
    if (type === "search") {
      const q = searchParams.get("q") ?? "";
      if (!q.trim()) return NextResponse.json([]);
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
      const lat = searchParams.get("lat");
      const lon = searchParams.get("lon");
      if (!lat || !lon) return NextResponse.json({}, { status: 400 });
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
