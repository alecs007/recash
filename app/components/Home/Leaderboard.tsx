"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FaWineBottle } from "react-icons/fa";
import { Trophy, ChevronRight, Medal } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string | null;
  image: string | null;
  totalBottles: number;
}

const MEDAL_COLORS: Record<
  number,
  { bg: string; text: string; border: string; icon: string }
> = {
  1: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: "text-amber-500",
  },
  2: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
    icon: "text-slate-400",
  },
  3: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    icon: "text-orange-400",
  },
};

function RankBadge({ rank }: { rank: number }) {
  const m = MEDAL_COLORS[rank];
  if (m) {
    return (
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${m.bg} ${m.border}`}
      >
        <Medal className={`w-4 h-4 ${m.icon}`} />
      </div>
    );
  }
  return (
    <div className="shrink-0 w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
      <span className="text-xs font-black text-slate-500">#{rank}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 bg-slate-100 rounded-2xl px-4 py-3"
        >
          <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
          <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 bg-slate-200 rounded-lg" />
            <div className="h-2.5 w-16 bg-slate-200 rounded-lg" />
          </div>
          <div className="h-4 w-12 bg-slate-200 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function LeaderboardSection() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/leaderboard?limit=10")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="px-0 py-12 lg:py-20">
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
        <div className="lg:w-96 shrink-0">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            Cei mai activi
            <br />
            <span className="text-lime-500 italic">reciclatori</span>
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Clasamentul se actualizează în timp real pe baza numărului total de
            sticle reciclate.
          </p>
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-2 bg-[#123424] text-white font-bold py-3 px-6 rounded-full text-sm hover:bg-[#1a4d36] transition-colors"
          >
            Vezi tot clasamentul
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex-1 min-w-0">
          {loading ? (
            <Skeleton />
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => {
                const m = MEDAL_COLORS[entry.rank];
                const isTop3 = entry.rank <= 3;
                return (
                  <Link
                    key={entry.id}
                    href={`/user/${entry.id}`}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 border transition-all group
                      ${
                        isTop3
                          ? `${m!.bg} ${m!.border} hover:shadow-sm`
                          : "bg-white border-slate-100 hover:border-slate-200"
                      }`}
                  >
                    <RankBadge rank={entry.rank} />

                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {entry.image ? (
                        <Image
                          src={entry.image}
                          alt={entry.name ?? ""}
                          width={36}
                          height={36}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-500">
                          {entry.name?.[0] ?? "?"}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate group-hover:text-slate-700">
                        {entry.name ?? "Utilizator"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {entry.totalBottles.toLocaleString("ro-RO")} sticle
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <FaWineBottle className="w-3 h-3 text-lime-500" />
                      <span className="text-sm font-black tabular-nums text-slate-800">
                        {entry.totalBottles.toLocaleString("ro-RO")}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
