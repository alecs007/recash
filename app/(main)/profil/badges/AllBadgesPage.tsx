"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import useSWR from "swr";
import {
  BadgeCard,
  BadgeCardSkeleton,
  BadgeData,
} from "@/app/components/UI/BadgeCard";
import { BADGE_CONFIG } from "@/lib/constants/badges";

const GROUPS = ["Postări", "Colectări", "Eco", "Activitate", "Speciale"];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function makeUnearnedBadge(type: string): BadgeData {
  return { id: `__unearned__${type}`, type, earnedAt: "", seen: true };
}

function Skeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="mb-8">
        <div className="w-full h-2 bg-slate-100 rounded-full" />
        <div className="flex justify-end mt-1.5">
          <div className="h-4 w-28 bg-slate-100 rounded" />
        </div>
      </div>

      {[1, 2, 3, 4].map((g) => (
        <div key={g}>
          <div className="h-5 w-24 bg-slate-100 rounded-lg mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <BadgeCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AllBadgesPage() {
  const {
    data: badges = [],
    isLoading,
    mutate,
  } = useSWR<BadgeData[]>("/api/v1/profile/badges", fetcher);

  const earnedTypes = new Set(badges.map((b) => b.type));
  const earnedCount = Object.keys(BADGE_CONFIG).filter((t) =>
    earnedTypes.has(t),
  ).length;
  const total = Object.keys(BADGE_CONFIG).length;

  const handleSeen = (id: string) => {
    mutate(
      (prev) => prev?.map((b) => (b.id === id ? { ...b, seen: true } : b)),
      { revalidate: false },
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 min-h-[100dvh]">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/profil"
          className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Badge-urile mele
        </h1>
      </div>

      {isLoading ? (
        <Skeleton />
      ) : (
        <>
          <div className="mb-8">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-lime-400 rounded-full transition-all duration-700"
                style={{ width: `${(earnedCount / total) * 100}%` }}
              />
            </div>
            <p className="text-sm text-slate-500 mt-1.5 text-right">
              <span className="font-bold text-lime-500">{earnedCount}</span> din{" "}
              {total} obținute
            </p>
          </div>

          <div className="space-y-8">
            {GROUPS.map((group) => {
              const groupTypes = Object.entries(BADGE_CONFIG)
                .filter(([, cfg]) => cfg.group === group)
                .map(([type]) => type);

              return (
                <div key={group}>
                  <h2 className="font-bold text-slate-900 mb-3 tracking-wide">
                    {group}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {groupTypes.map((type) => {
                      const badge = badges.find((b) => b.type === type);
                      if (badge) {
                        return (
                          <BadgeCard
                            key={type}
                            badge={badge}
                            earned
                            onSeen={handleSeen}
                          />
                        );
                      }
                      return (
                        <BadgeCard
                          key={type}
                          badge={makeUnearnedBadge(type)}
                          earned={false}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
