import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

const CACHE_TTL = 60;
const DEFAULT_LIMIT = 20;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(
    50,
    Math.max(
      1,
      parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT)) ||
        DEFAULT_LIMIT,
    ),
  );
  const userId = searchParams.get("userId") ?? null;
  const skip = (page - 1) * limit;

  const cacheKey = userId
    ? `leaderboard:rank:${userId}`
    : `leaderboard:page:${page}:${limit}`;

  try {
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) return NextResponse.json(JSON.parse(cached));
  } catch {}

  try {
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          image: true,
          totalBottlesGiven: true,
          totalBottlesCollected: true,
          createdAt: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: "Utilizator negăsit" },
          { status: 404 },
        );
      }

      const totalBottles = user.totalBottlesGiven + user.totalBottlesCollected;

      const usersAbove = await prisma.user.findMany({
        where: {
          OR: [
            {
              totalBottlesGiven: { gte: 0 },
              totalBottlesCollected: { gte: 0 },
            },
          ],
        },
        select: {
          totalBottlesGiven: true,
          totalBottlesCollected: true,
          createdAt: true,
        },
      });

      const aboveCount = usersAbove.filter((u) => {
        const uTotal = u.totalBottlesGiven + u.totalBottlesCollected;
        if (uTotal > totalBottles) return true;
        if (uTotal === totalBottles && u.createdAt < user.createdAt)
          return true;
        return false;
      }).length;

      const userRank = aboveCount + 1;

      const payload = {
        rank: userRank,
        totalBottles,
        user: { id: user.id, name: user.name, image: user.image },
      };

      await redis
        .set(cacheKey, JSON.stringify(payload), "EX", CACHE_TTL)
        .catch(() => {});
      return NextResponse.json(payload);
    }

    const [allUsers, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          image: true,
          totalBottlesGiven: true,
          totalBottlesCollected: true,
          createdAt: true,
        },
      }),
      prisma.user.count(),
    ]);

    allUsers.sort((a, b) => {
      const aTotal = a.totalBottlesGiven + a.totalBottlesCollected;
      const bTotal = b.totalBottlesGiven + b.totalBottlesCollected;
      if (bTotal !== aTotal) return bTotal - aTotal;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const entries = allUsers.slice(skip, skip + limit).map((u, i) => ({
      rank: skip + i + 1,
      id: u.id,
      name: u.name,
      image: u.image,
      totalBottles: u.totalBottlesGiven + u.totalBottlesCollected,
    }));

    const payload = {
      entries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };

    await redis
      .set(cacheKey, JSON.stringify(payload), "EX", CACHE_TTL)
      .catch(() => {});
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[GET /api/v1/leaderboard]", err);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}
