"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import useSWR from "swr";

type Badge = {
  id: string;
  type: string;
  earnedAt: string;
  seen: boolean;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type BadgeCfg = { emoji: string; label: string; desc: string; group: string };

const BADGE_CONFIG: Record<string, BadgeCfg> = {
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

const BADGE_COLORS: Record<string, string> = {
  FIRST_POST: "#2563EB",
  POST_VETERAN_10: "#2563EB",
  POST_VETERAN_50: "#1D4ED8",
  POST_VETERAN_100: "#1E3A8A",
  FIRST_COLLECTION: "#EA580C",
  COLLECTOR_STARTER_10: "#EA580C",
  COLLECTOR_PRO_50: "#C2410C",
  COLLECTOR_ELITE_100: "#9A3412",
  ECO_STARTER: "#16A34A",
  ECO_WARRIOR: "#15803D",
  ECO_CHAMPION: "#166534",
  ECO_LEGEND: "#14532D",
  SPEED_DEMON: "#9333EA",
  FIRST_WEEK: "#0D9488",
  MONTHLY_ACTIVE: "#0891B2",
  VETERAN_1_YEAR: "#0369A1",
  CENTURION: "#1E293B",
  PERFECT_RATING: "#D97706",
};

const GROUPS = ["Postări", "Colectări", "Eco", "Activitate", "Speciale"];

// ─── Hex Badge Card ───────────────────────────────────────────────────────────

function BadgeCard({
  type,
  cfg,
  earned,
  earnedAt,
}: {
  type: string;
  cfg: { emoji: string; label: string; desc: string };
  earned: boolean;
  earnedAt?: string;
}) {
  const color = earned ? (BADGE_COLORS[type] ?? "#64748B") : "#CBD5E1";

  return (
    <div
      className={`
        flex flex-col items-center gap-3 p-4 rounded-2xl bg-white border transition-colors
        ${earned ? "border-slate-200 hover:border-slate-300" : "border-slate-100 opacity-40 grayscale pointer-events-none"}
      `}
    >
      {/* Hex */}
      <div className="relative w-[56px] h-[63px] flex-shrink-0">
        <div
          className="absolute inset-0"
          style={{
            clipPath:
              "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            backgroundColor: `color-mix(in srgb, ${color} 60%, black)`,
          }}
        />
        <div
          className="absolute"
          style={{
            inset: "2.5px",
            clipPath:
              "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            backgroundColor: color,
          }}
        />
        <span
          className="absolute inset-0 flex items-center justify-center"
          style={{ fontSize: "22px", lineHeight: 1 }}
        >
          {cfg.emoji}
        </span>
      </div>

      {/* Text */}
      <div className="flex flex-col items-center gap-1 text-center w-full">
        <p className="text-[11px] font-bold text-slate-800 leading-tight">
          {cfg.label}
        </p>
        <p className="text-[9px] text-slate-400 leading-snug">{cfg.desc}</p>
      </div>

      {/* Date */}
      <div className="w-full pt-2 border-t border-slate-100 text-center">
        <span className="text-[9px] font-semibold text-slate-400">
          {earnedAt
            ? new Date(earnedAt).toLocaleDateString("ro-RO", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "Neobținut"}
        </span>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {[1, 2].map((g) => (
        <div key={g}>
          <div className="h-5 w-24 bg-slate-100 rounded-lg mb-4" />
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-100 bg-white p-4 flex flex-col items-center gap-3"
              >
                <div
                  className="w-[56px] h-[63px] bg-slate-100"
                  style={{
                    clipPath:
                      "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                  }}
                />
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <div className="h-2.5 w-14 bg-slate-100 rounded" />
                  <div className="h-2 w-12 bg-slate-100 rounded" />
                </div>
                <div className="w-full pt-2 border-t border-slate-100">
                  <div className="h-2 w-10 bg-slate-100 rounded mx-auto" />
                </div>
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
      <div className="flex items-center gap-3 mb-4">
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

      {/* Progress */}
      {!isLoading && (
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
                <h2 className="font-bold text-slate-900 mb-3 tracking-wide">
                  {group}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {groupBadges.map(([type, cfg]) => {
                    const badge = badges.find((b) => b.type === type);
                    return (
                      <BadgeCard
                        key={type}
                        type={type}
                        cfg={cfg}
                        earned={earnedTypes.has(type)}
                        earnedAt={badge?.earnedAt}
                      />
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
