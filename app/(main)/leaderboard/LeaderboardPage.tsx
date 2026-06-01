"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useCallback } from "react";
import useSWR from "swr";
import { FaWineBottle, FaMedal } from "react-icons/fa";
import { ArrowLeft } from "lucide-react";
import { Pagination } from "@/app/components/UI/Pagination";
import { PageTransition } from "@/app/components/UI/PageTransition";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string | null;
  image: string | null;
  totalBottles: number;
}

const MEDAL_COLORS: Record<
  number,
  {
    bg: string;
    text: string;
    border: string;
    icon: string;
    rowBg: string;
    rowBorder: string;
  }
> = {
  1: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: "text-amber-500",
    rowBg: "bg-amber-50",
    rowBorder: "border-amber-200",
  },
  2: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
    icon: "text-slate-400",
    rowBg: "bg-slate-50",
    rowBorder: "border-slate-200",
  },
  3: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    icon: "text-orange-400",
    rowBg: "bg-orange-50",
    rowBorder: "border-orange-200",
  },
};

function RankBadge({ rank }: { rank: number }) {
  const m = MEDAL_COLORS[rank];
  if (m) {
    return (
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${m.bg} ${m.border}`}
      >
        <FaMedal className={`w-4 h-4 ${m.icon}`} />
      </div>
    );
  }
  return (
    <div className="shrink-0 w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
      <span className="text-xs font-black text-slate-500">#{rank}</span>
    </div>
  );
}

function EntryRow({ entry }: { entry: LeaderboardEntry }) {
  const m = MEDAL_COLORS[entry.rank];
  return (
    <Link
      href={`/user/${entry.id}`}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all hover:shadow-sm group ${
        m
          ? `${m.rowBg} ${m.rowBorder}`
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
          {entry.totalBottles.toLocaleString("ro-RO")} sticle reciclate
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
}

function Skeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 px-4 py-3"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
          <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-32 bg-slate-100 rounded-lg" />
            <div className="h-2.5 w-20 bg-slate-100 rounded-lg" />
          </div>
          <div className="h-4 w-12 bg-slate-100 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSWR(
    `/api/v1/leaderboard?page=${page}&limit=20`,
    fetcher,
  );

  const entries: LeaderboardEntry[] = data?.entries ?? [];
  const totalPages: number = data?.totalPages ?? 1;

  const handlePageChange = useCallback((p: number) => setPage(p), []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 min-h-[100dvh]">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/"
          className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Clasamentul Recash
          </h1>
        </div>
      </div>

      <PageTransition page={isLoading ? -1 : page}>
        {isLoading ? (
          <Skeleton />
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <FaWineBottle className="w-10 h-10 text-slate-200 mx-auto mb-4" />
            <p className="font-bold text-slate-700">Niciun participant încă</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {entries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </PageTransition>
    </div>
  );
}
