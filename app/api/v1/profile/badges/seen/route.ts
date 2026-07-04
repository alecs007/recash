import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { invalidate } from "@/lib/cache";
import { rateLimit, RL } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.write);
  if (!rl.ok) return rl.response;

  let ids: string[] | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.ids !== undefined) {
      if (
        !Array.isArray(body.ids) ||
        body.ids.length === 0 ||
        body.ids.length > 100 ||
        !body.ids.every(
          (i: unknown) =>
            typeof i === "string" && i.length > 0 && i.length <= 100,
        )
      ) {
        return NextResponse.json(
          { error: "ids trebuie să fie un array de string-uri (max 100)" },
          { status: 400 },
        );
      }
      ids = body.ids as string[];
    }
  } catch {}

  try {
    const where = ids?.length
      ? { userId: session.user.id, id: { in: ids }, seen: false }
      : { userId: session.user.id, seen: false };

    await prisma.badge.updateMany({ where, data: { seen: true } });

    await invalidate(
      `profile:${session.user.id}:badges`,
      `profile:${session.user.id}:summary`,
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/v1/profile/badges/seen]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
