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
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") ?? "15") || 15),
    );
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
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          read: true,
          link: true,
          createdAt: true,
          // metadata omitted, exposed only what the client actually needs
        },
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
    }

    const { ids, markAllRead } = body as Record<string, unknown>;

    if (markAllRead === true) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    if (ids !== undefined) {
      if (
        !Array.isArray(ids) ||
        ids.length === 0 ||
        ids.length > 100 ||
        !ids.every((id) => typeof id === "string" && id.length > 0)
      ) {
        return NextResponse.json(
          {
            error: "ID invalid - trebuie să fie un șir de string-uri (max 100)",
          },
          { status: 400 },
        );
      }

      await prisma.notification.updateMany({
        where: {
          userId: session.user.id, // ensures users can only mark their own notifications
          id: { in: ids as string[] },
        },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Nicio acțiune specificată" },
      { status: 400 },
    );
  } catch (err) {
    console.error("[PATCH /api/v1/profile/notifications]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
