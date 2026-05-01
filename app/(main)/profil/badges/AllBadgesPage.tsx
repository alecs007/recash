"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import useSWR from "swr";

// ─── Types ────────────────────────────────────────────────────────────────────

type Badge = {
  id: string;
  type: string;
  earnedAt: string;
  seen: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const BADGE_CONFIG: Record<
  string,
  { emoji: string; label: string; desc: string; group: string }
> = {
  FIRST_POST: {
    emoji: "🍾",
    label: "Prima Postare",
    desc: "Ai postat pentru prima dată",
    group: "Postări",
  },
  POST_VETERAN_10: {
    emoji: "📦",
    label: "10 Postări",
    desc: "Ai publicat 10 anunțuri",
    group: "Postări",
  },
  POST_VETERAN_50: {
    emoji: "🏗️",
    label: "50 Postări",
    desc: "Ai publicat 50 de anunțuri",
    group: "Postări",
  },
  POST_VETERAN_100: {
    emoji: "🏆",
    label: "100 Postări",
    desc: "Maestru al postărilor",
    group: "Postări",
  },
  FIRST_COLLECTION: {
    emoji: "🚲",
    label: "Prima Colectare",
    desc: "Ai colectat pentru prima dată",
    group: "Colectări",
  },
  COLLECTOR_STARTER_10: {
    emoji: "🛵",
    label: "10 Colectări",
    desc: "10 colectări finalizate",
    group: "Colectări",
  },
  COLLECTOR_PRO_50: {
    emoji: "⚙️",
    label: "50 Colectări",
    desc: "Colector profesionist",
    group: "Colectări",
  },
  COLLECTOR_ELITE_100: {
    emoji: "🦅",
    label: "100 Colectări",
    desc: "Colector de elită",
    group: "Colectări",
  },
  ECO_STARTER: {
    emoji: "🌱",
    label: "Eco Starter",
    desc: "50 sticle reciclate total",
    group: "Eco",
  },
  ECO_WARRIOR: {
    emoji: "🌿",
    label: "Eco Warrior",
    desc: "250 sticle reciclate total",
    group: "Eco",
  },
  ECO_CHAMPION: {
    emoji: "🌳",
    label: "Eco Champion",
    desc: "1.000 sticle reciclate",
    group: "Eco",
  },
  ECO_LEGEND: {
    emoji: "🌍",
    label: "Eco Legend",
    desc: "5.000 sticle reciclate",
    group: "Eco",
  },
  SPEED_DEMON: {
    emoji: "⚡",
    label: "Speed Demon",
    desc: "Finalizat în sub 30 minute",
    group: "Speciale",
  },
  FIRST_WEEK: {
    emoji: "🌸",
    label: "Prima Săptămână",
    desc: "Activ în prima săptămână",
    group: "Activitate",
  },
  MONTHLY_ACTIVE: {
    emoji: "📅",
    label: "Activ Lunar",
    desc: "Activ luna aceasta",
    group: "Activitate",
  },
  VETERAN_1_YEAR: {
    emoji: "🎖️",
    label: "Veteran 1 An",
    desc: "1 an de activitate",
    group: "Activitate",
  },
  CENTURION: {
    emoji: "💯",
    label: "Centurion",
    desc: "100 tranzacții finalizate",
    group: "Speciale",
  },
  PERFECT_RATING: {
    emoji: "⭐",
    label: "Rating Perfect",
    desc: "Media 5/5 după 10 tranzacții",
    group: "Speciale",
  },
};

const GROUPS = ["Postări", "Colectări", "Eco", "Activitate", "Speciale"];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {[1, 2].map((g) => (
        <div key={g}>
          <div className="h-5 w-24 bg-slate-100 rounded-lg mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-100 p-4 flex flex-col items-center gap-2.5"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-full" />
                <div className="h-4 w-20 bg-slate-100 rounded-lg" />
                <div className="h-3 w-24 bg-slate-100 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AllBadgesPage() {
  const { data: badges = [], isLoading } = useSWR<Badge[]>(
    "/api/v1/profile/badges",
    fetcher,
  );
  const earnedTypes = new Set(badges.map((b) => b.type));
  const earnedCount = Object.keys(BADGE_CONFIG).filter((t) =>
    earnedTypes.has(t),
  ).length;
  const total = Object.keys(BADGE_CONFIG).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/profil"
          className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Badge-urile mele
          </h1>
        </div>
      </div>

      {/* Progress bar */}
      {!isLoading && (
        <div className="mb-8 mt-4">
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-lime-400 rounded-full transition-all duration-700"
              style={{ width: `${(earnedCount / total) * 100}%` }}
            />
          </div>
          {!isLoading && (
            <p className="text-sm text-slate-500 mt-1.5 text-right">
              <span className="font-bold text-lime-600">{earnedCount}</span> din{" "}
              {total} obținute
            </p>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <Skeleton />
      ) : (
        <div className="space-y-8">
          {GROUPS.map((group) => {
            const groupBadges = Object.entries(BADGE_CONFIG).filter(
              ([, cfg]) => cfg.group === group,
            );
            return (
              <div key={group}>
                <h2 className="font-semibold text-slate-700 mb-3">{group}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {groupBadges.map(([type, cfg]) => {
                    const earned = earnedTypes.has(type);
                    const badge = badges.find((b) => b.type === type);
                    return (
                      <div
                        key={type}
                        className={`rounded-2xl border p-4 flex flex-col items-center text-center transition-all ${
                          earned
                            ? "bg-gradient-to-br from-lime-50 to-emerald-50 border-lime-200 shadow-sm"
                            : "bg-slate-50 border-slate-100 opacity-50 grayscale"
                        }`}
                      >
                        <div className="text-3xl mb-2">{cfg.emoji}</div>
                        <div className="font-bold text-sm text-slate-900">
                          {cfg.label}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 leading-tight">
                          {cfg.desc}
                        </div>
                        {badge ? (
                          <div className="text-xs text-lime-600 font-semibold mt-2">
                            {new Date(badge.earnedAt).toLocaleDateString(
                              "ro-RO",
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 mt-2 font-medium">
                            Neobținut
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
