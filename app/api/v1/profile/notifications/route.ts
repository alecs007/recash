import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cached, invalidate, CacheKey, TTL } from "@/lib/cache";
import { rateLimit, RL } from "@/lib/rate-limit";
import { redis } from "@/lib/redis";

async function redis_scan(pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = "0";
  try {
    do {
      const [nextCursor, batch] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        50,
      );
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== "0");
  } catch (err) {
    console.error("[redis_scan]", err);
  }
  return keys;
}
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.read);
  if (!rl.ok) return rl.response;

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

  const cacheKey = CacheKey.notifications(
    session.user.id,
    page,
    limit,
    unreadOnly,
  );

  try {
    const result = await cached(cacheKey, TTL.notifications, async () => {
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
          },
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: { userId: session.user.id, read: false },
        }),
      ]);
      return { notifications, total, unreadCount };
    });

    return NextResponse.json({
      notifications: result.notifications,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
      unreadCount: result.unreadCount,
    });
  } catch (err) {
    console.error("[GET /api/v1/profile/notifications]", err);
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

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
  }

  const { ids, markAllRead } = body as Record<string, unknown>;

  try {
    if (markAllRead === true) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true },
      });
    } else if (ids !== undefined) {
      if (
        !Array.isArray(ids) ||
        ids.length === 0 ||
        ids.length > 100 ||
        !ids.every((id) => typeof id === "string" && id.length > 0)
      ) {
        return NextResponse.json(
          { error: "ids trebuie să fie un array de string-uri (max 100)" },
          { status: 400 },
        );
      }

      await prisma.notification.updateMany({
        where: { userId: session.user.id, id: { in: ids as string[] } },
        data: { read: true },
      });
    } else {
      return NextResponse.json(
        { error: "Nicio acțiune specificată" },
        { status: 400 },
      );
    }

    const pattern = `profile:${session.user.id}:notif:*`;
    const keys = await redis_scan(pattern);
    if (keys.length > 0) await invalidate(...keys);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/v1/profile/notifications]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
