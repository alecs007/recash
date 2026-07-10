import { prisma } from "@/lib/prisma";
import {
  LeaderboardList,
  type LeaderboardEntry,
} from "./LeaderboardList";

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        image: true,
        certified: true,
        totalBottlesGiven: true,
        totalBottlesCollected: true,
        reputationScore: true,
        ratingCount: true,
        createdAt: true,
      },
    });

    allUsers.sort((a, b) => {
      const aTotal = a.totalBottlesGiven + a.totalBottlesCollected;
      const bTotal = b.totalBottlesGiven + b.totalBottlesCollected;
      if (bTotal !== aTotal) return bTotal - aTotal;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return allUsers.slice(0, 10).map((u, i) => ({
      rank: i + 1,
      id: u.id,
      name: u.name,
      image: u.image,
      certified: u.certified,
      totalBottles: u.totalBottlesGiven + u.totalBottlesCollected,
      reputationScore: u.reputationScore,
      ratingCount: u.ratingCount,
    }));
  } catch {
    return [];
  }
}

export async function LeaderboardSection() {
  const entries = await getLeaderboard();
  return <LeaderboardList entries={entries} />;
}
