"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useCallback } from "react";
import useSWR from "swr";
import { Trophy, Medal } from "lucide-react";
import { FaWineBottle } from "react-icons/fa";
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

const MEDAL: Record<
  number,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    ring: string;
    avatar: string;
  }
> = {
  1: {
    label: "Aur",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    ring: "ring-2 ring-amber-300",
    avatar: "bg-amber-100 border-amber-200",
  },
  2: {
    label: "Argint",
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
    ring: "ring-2 ring-slate-300",
    avatar: "bg-slate-100 border-slate-200",
  },
  3: {
    label: "Bronz",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    ring: "ring-2 ring-orange-300",
    avatar: "bg-orange-100 border-orange-200",
  },
};

function TopThreeCard({ entry }: { entry: LeaderboardEntry }) {
  const m = MEDAL[entry.rank]!;
  const order: Record<number, string> = {
    1: "order-2",
    2: "order-1",
    3: "order-3",
  };
  const size: Record<number, string> = {
    1: "w-20 h-20 sm:w-24 sm:h-24",
    2: "w-16 h-16 sm:w-20 sm:h-20",
    3: "w-16 h-16 sm:w-20 sm:h-20",
  };

  return (
    <Link
      href={`/user/${entry.id}`}
      className={`flex flex-col items-center gap-3 flex-1 min-w-0 ${order[entry.rank]}`}
    >
      <div className="relative">
        <div
          className={`${size[entry.rank]} rounded-full overflow-hidden border-2 ${m.border} ${m.ring} ${m.avatar} flex items-center justify-center`}
        >
          {entry.image ? (
            <Image
              src={entry.image}
              alt={entry.name ?? ""}
              width={96}
              height={96}
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="text-2xl font-black text-slate-500">
              {entry.name?.[0] ?? "?"}
            </span>
          )}
        </div>
        <div
          className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black ${m.bg} ${m.text}`}
        >
          {entry.rank}
        </div>
      </div>
      <div className="text-center mt-1">
        <p className="text-sm font-bold text-slate-900 truncate max-w-[110px]">
          {entry.name ?? "Utilizator"}
        </p>
        <div className="flex items-center justify-center gap-1 mt-0.5">
          <FaWineBottle className="w-2.5 h-2.5 text-lime-600" />
          <span className="text-xs font-black text-lime-700">
            {entry.totalBottles.toLocaleString("ro-RO")}
          </span>
        </div>
      </div>
    </Link>
  );
}

function EntryRow({ entry }: { entry: LeaderboardEntry }) {
  const m = MEDAL[entry.rank];
  return (
    <Link
      href={`/user/${entry.id}`}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 border transition-all hover:shadow-sm
        ${m ? `${m.bg} ${m.border}` : "bg-white border-slate-100 hover:border-slate-200"}`}
    >
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border text-xs font-black
        ${m ? `${m.bg} ${m.border} ${m.text}` : "bg-slate-50 border-slate-200 text-slate-500"}`}
      >
        {m ? <Medal className="w-3.5 h-3.5" /> : `#${entry.rank}`}
      </div>

      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
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
        <p className="text-sm font-semibold text-slate-900 truncate">
          {entry.name ?? "Utilizator"}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <FaWineBottle className="w-3 h-3 text-lime-500" />
        <span className="text-sm font-black text-slate-800 tabular-nums">
          {entry.totalBottles.toLocaleString("ro-RO")}
        </span>
        <span className="text-xs text-slate-400">sticle</span>
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
          <div className="flex-1">
            <div className="h-3 w-32 bg-slate-100 rounded-lg" />
          </div>
          <div className="h-4 w-16 bg-slate-100 rounded-lg" />
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
  const total: number = data?.total ?? 0;

  const top3 = page === 1 ? entries.slice(0, 3) : [];
  const rest = page === 1 ? entries.slice(3) : entries;

  const handlePageChange = useCallback((p: number) => setPage(p), []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 min-h-[100dvh]">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5 text-slate-700" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Clasament reciclatori
          </h1>
          {total > 0 && (
            <p className="text-sm text-slate-400">
              {total.toLocaleString("ro-RO")} participanți
            </p>
          )}
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
            {top3.length === 3 && (
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 mb-6">
                <p className="text-xs font-bold text-slate-400 tracking-widest uppercase text-center mb-8">
                  Top 3
                </p>
                <div className="flex items-end justify-center gap-6 sm:gap-10">
                  {[top3[1], top3[0], top3[2]].filter(Boolean).map((e) => (
                    <TopThreeCard key={e.id} entry={e} />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {rest.map((entry) => (
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
