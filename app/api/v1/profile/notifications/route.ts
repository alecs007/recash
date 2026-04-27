import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "15");
    const unreadOnly = searchParams.get("unread") === "true";
    const skip = (page - 1) * limit;

    const where = {
      userId: session.user.id,
      ...(unreadOnly && { read: false }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: session.user.id, read: false },
      }),
    ]);

    return NextResponse.json({
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    });
  } catch (err) {
    console.error("[GET /api/v1/profile/notifications]", err);
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
    const { ids, markAllRead } = body;

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true },
      });
    } else if (ids && Array.isArray(ids)) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, id: { in: ids } },
        data: { read: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/v1/profile/notifications]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
