import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        createdAt: true,
        totalBottlesGiven: true,
        totalBottlesCollected: true,
        totalTransactions: true,
        totalEarned: true,
        totalSaved: true,
        reputationScore: true,
        ratingCount: true,
        _count: {
          select: {
            posts: true,
            claimedPosts: true,
            badges: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilizator negăsit" },
        { status: 404 },
      );
    }

    return NextResponse.json(user);
  } catch (err) {
    console.error("[GET /api/v1/profile]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
    }

    const { name, phone } = body as Record<string, unknown>;

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        name.trim().length === 0 ||
        name.trim().length > 100
      ) {
        return NextResponse.json(
          { error: "Nume invalid (max 100 caractere)" },
          { status: 400 },
        );
      }
    }

    if (phone !== undefined) {
      if (typeof phone !== "string" || phone.trim().length > 20) {
        return NextResponse.json(
          { error: "Telefon invalid (max 20 caractere)" },
          { status: 400 },
        );
      }

      if (phone.trim().length > 0 && !/^[\d\s\+\-\(\)]+$/.test(phone.trim())) {
        return NextResponse.json(
          { error: "Format telefon invalid" },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name: (name as string).trim() }),
        ...(phone !== undefined && { phone: (phone as string).trim() || null }),
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/v1/profile]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
