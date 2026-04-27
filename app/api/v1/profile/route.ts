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
        role: true,
        bio: true,
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

    const body = await req.json();
    const { bio, phone, name } = body;

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(bio !== undefined && { bio }),
        ...(phone !== undefined && { phone }),
        ...(name !== undefined && { name }),
      },
      select: {
        id: true,
        name: true,
        bio: true,
        phone: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/v1/profile]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
