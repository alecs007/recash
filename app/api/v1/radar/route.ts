import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RL } from "@/lib/rate-limit";

const VALID_RADII = [1, 2, 5, 10, 25, 50] as const;
type ValidRadius = (typeof VALID_RADII)[number];

function isValidRadius(v: unknown): v is ValidRadius {
  return VALID_RADII.includes(v as ValidRadius);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.read);
  if (!rl.ok) return rl.response;

  try {
    const radar = await prisma.radar.findUnique({
      where: { userId: session.user.id },
    });
    return NextResponse.json({ radar: radar ?? null });
  } catch (err) {
    console.error("[GET /api/v1/radar]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.write);
  if (!rl.ok) return rl.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
  }

  const { latitude, longitude, locationName, radiusKm, emailEnabled } =
    body as Record<string, unknown>;

  if (
    typeof latitude !== "number" ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== "number" ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json({ error: "Coordonate invalide" }, { status: 400 });
  }

  if (!isValidRadius(radiusKm)) {
    return NextResponse.json(
      { error: "Raza trebuie să fie 1, 2, 5, 10, 25 sau 50 km" },
      { status: 400 },
    );
  }

  try {
    const radar = await prisma.radar.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        latitude,
        longitude,
        locationName:
          typeof locationName === "string" ? locationName.trim() || null : null,
        radiusKm,
        emailEnabled: emailEnabled === true,
        active: true,
      },
      update: {
        latitude,
        longitude,
        locationName:
          typeof locationName === "string" ? locationName.trim() || null : null,
        radiusKm,
        emailEnabled: emailEnabled === true,
        active: true,
      },
    });

    return NextResponse.json({ radar });
  } catch (err) {
    console.error("[POST /api/v1/radar]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.write);
  if (!rl.ok) return rl.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
  }

  const { active, emailEnabled, radiusKm, latitude, longitude, locationName } =
    body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (typeof active === "boolean") data.active = active;
  if (typeof emailEnabled === "boolean") data.emailEnabled = emailEnabled;
  if (isValidRadius(radiusKm)) data.radiusKm = radiusKm;
  if (
    typeof latitude === "number" &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    longitude >= -180 &&
    longitude <= 180
  ) {
    data.latitude = latitude;
    data.longitude = longitude;
    if (typeof locationName === "string")
      data.locationName = locationName.trim() || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Niciun câmp de actualizat" },
      { status: 400 },
    );
  }

  try {
    const radar = await prisma.radar.update({
      where: { userId: session.user.id },
      data,
    });
    return NextResponse.json({ radar });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "P2025") {
      return NextResponse.json({ error: "Radarul nu există" }, { status: 404 });
    }
    console.error("[PATCH /api/v1/radar]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.write);
  if (!rl.ok) return rl.response;

  try {
    await prisma.radar.delete({ where: { userId: session.user.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "P2025") {
      return NextResponse.json({ error: "Radarul nu există" }, { status: 404 });
    }
    console.error("[DELETE /api/v1/radar]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
