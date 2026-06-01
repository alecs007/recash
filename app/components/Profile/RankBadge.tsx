"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";

interface RankData {
  rank: number;
  totalBottles: number;
}

function ordinalSuffix(n: number): string {
  if (n === 1) return "locul 1";
  if (n === 2) return "locul 2";
  if (n === 3) return "locul 3";
  return `locul ${n}`;
}

export function ProfileRankBadge({ userId }: { userId: string }) {
  const [data, setData] = useState<RankData | null>(null);

  useEffect(() => {
    fetch(`/api/v1/leaderboard?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.rank) setData({ rank: d.rank, totalBottles: d.totalBottles });
      })
      .catch(() => {});
  }, [userId]);

  if (!data) return null;

  const isTop3 = data.rank <= 3;
  const isTop10 = data.rank <= 10;

  return (
    <Link
      href="/leaderboard"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors
        ${
          isTop3
            ? "bg-amber-400/20 text-amber-300 border border-amber-400/30 hover:bg-amber-400/30"
            : isTop10
              ? "bg-lime-400/20 text-lime-300 border border-lime-400/30 hover:bg-lime-400/30"
              : "bg-white/10 text-white/70 border border-white/15 hover:bg-white/15"
        }`}
    >
      <Trophy className="w-3 h-3" />
      {ordinalSuffix(data.rank)} în clasament
    </Link>
  );
}
