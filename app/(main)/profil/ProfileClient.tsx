"use client";

import { useState } from "react";
import Image from "next/image";
import {
  User,
  Star,
  Recycle,
  Trophy,
  ArrowUpRight,
  Bell,
  Calendar,
  Phone,
  FileText,
  Zap,
  Shield,
  ChevronRight,
  MapPin,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { FaWineBottle } from "react-icons/fa";
import { LuBike } from "react-icons/lu";
import useSWR from "swr";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: "POSTER" | "COLLECTOR" | "BOTH" | "ADMIN";
  bio: string | null;
  phone: string | null;
  createdAt: Date;
  totalBottlesGiven: number;
  totalBottlesCollected: number;
  totalTransactions: number;
  totalEarned: number;
  totalSaved: number;
  reputationScore: number;
  ratingCount: number;
  _count: { posts: number; claimedPosts: number; badges: number };
};

type Post = {
  id: string;
  status: string;
  description: string;
  bottleCount: number;
  estimatedValue: number;
  collectorSharePercent: number;
  locationName: string | null;
  createdAt: Date;
  collector?: { id: string; name: string | null; image: string | null } | null;
  transaction?: { actualValue: number; posterEarning: number } | null;
};

type Transaction = {
  id: string;
  bottleCount: number;
  actualValue: number;
  collectorEarning: number;
  posterEarning: number;
  collectorRating: number | null;
  posterRating: number | null;
  completedAt: string;
  posterId: string;
  post: { id: string; description: string; locationName: string | null };
  poster: { id: string; name: string | null; image: string | null };
  collector: { id: string; name: string | null; image: string | null };
};

type Badge = {
  id: string;
  type: string;
  earnedAt: string;
  seen: boolean;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: Date;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ROLE_LABELS: Record<string, string> = {
  POSTER: "Poster",
  COLLECTOR: "Colector",
  BOTH: "Poster & Colector",
  ADMIN: "Administrator",
};

const BADGE_CONFIG: Record<
  string,
  { emoji: string; label: string; desc: string; color: string }
> = {
  FIRST_POST: {
    emoji: "🍾",
    label: "Prima Postare",
    desc: "Ai postat pentru prima dată",
    color: "lime",
  },
  POST_VETERAN_10: {
    emoji: "📦",
    label: "10 Postări",
    desc: "Ai publicat 10 anunțuri",
    color: "green",
  },
  POST_VETERAN_50: {
    emoji: "🏗️",
    label: "50 Postări",
    desc: "Ai publicat 50 de anunțuri",
    color: "emerald",
  },
  POST_VETERAN_100: {
    emoji: "🏆",
    label: "100 Postări",
    desc: "Maestru al postărilor",
    color: "teal",
  },
  FIRST_COLLECTION: {
    emoji: "🚲",
    label: "Prima Colectare",
    desc: "Ai colectat pentru prima dată",
    color: "sky",
  },
  COLLECTOR_STARTER_10: {
    emoji: "🛵",
    label: "10 Colectări",
    desc: "10 colectări finalizate",
    color: "blue",
  },
  COLLECTOR_PRO_50: {
    emoji: "⚙️",
    label: "50 Colectări",
    desc: "Colector profesionist",
    color: "indigo",
  },
  COLLECTOR_ELITE_100: {
    emoji: "🦅",
    label: "100 Colectări",
    desc: "Colector de elită",
    color: "violet",
  },
  ECO_STARTER: {
    emoji: "🌱",
    label: "Eco Starter",
    desc: "50 sticle reciclate total",
    color: "lime",
  },
  ECO_WARRIOR: {
    emoji: "🌿",
    label: "Eco Warrior",
    desc: "250 sticle reciclate total",
    color: "green",
  },
  ECO_CHAMPION: {
    emoji: "🌳",
    label: "Eco Champion",
    desc: "1.000 sticle reciclate",
    color: "emerald",
  },
  ECO_LEGEND: {
    emoji: "🌍",
    label: "Eco Legend",
    desc: "5.000 sticle reciclate",
    color: "teal",
  },
  SPEED_DEMON: {
    emoji: "⚡",
    label: "Speed Demon",
    desc: "Finalizat în sub 30 minute",
    color: "yellow",
  },
  FIRST_WEEK: {
    emoji: "🌸",
    label: "Prima Săptămână",
    desc: "Activ în prima săptămână",
    color: "pink",
  },
  MONTHLY_ACTIVE: {
    emoji: "📅",
    label: "Activ Lunar",
    desc: "Activ luna aceasta",
    color: "orange",
  },
  VETERAN_1_YEAR: {
    emoji: "🎖️",
    label: "Veteran 1 An",
    desc: "1 an de activitate",
    color: "amber",
  },
  CENTURION: {
    emoji: "💯",
    label: "Centurion",
    desc: "100 tranzacții finalizate",
    color: "red",
  },
  PERFECT_RATING: {
    emoji: "⭐",
    label: "Rating Perfect",
    desc: "Media 5/5 după 10 tranzacții",
    color: "yellow",
  },
};

const POST_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; Icon: any }
> = {
  OPEN: {
    label: "Deschis",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    Icon: AlertCircle,
  },
  CLAIMED: {
    label: "Revendicat",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    Icon: Clock,
  },
  IN_PROGRESS: {
    label: "În desfășurare",
    color: "text-amber-600 bg-amber-50 border-amber-200",
    Icon: Loader2,
  },
  COMPLETED: {
    label: "Finalizat",
    color: "text-lime-700 bg-lime-50 border-lime-200",
    Icon: CheckCircle,
  },
  CANCELLED: {
    label: "Anulat",
    color: "text-red-500 bg-red-50 border-red-200",
    Icon: XCircle,
  },
  EXPIRED: {
    label: "Expirat",
    color: "text-slate-500 bg-slate-50 border-slate-200",
    Icon: Clock,
  },
};

const NOTIF_ICON: Record<string, string> = {
  POST_CLAIMED: "🤝",
  POST_COMPLETED: "✅",
  POST_CANCELLED: "❌",
  POST_EXPIRED: "⏰",
  COLLECTOR_ARRIVED: "🚲",
  BADGE_EARNED: "🏅",
  RATING_RECEIVED: "⭐",
  SYSTEM: "🔔",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ score, count }: { score: number; count: number }) {
  const full = Math.floor(score);
  const half = score - full >= 0.5;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} className="w-4 h-4" viewBox="0 0 20 20">
            {i <= full ? (
              <path
                fill="#a3e635"
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            ) : i === full + 1 && half ? (
              <>
                <defs>
                  <linearGradient id={`half-${i}`}>
                    <stop offset="50%" stopColor="#a3e635" />
                    <stop offset="50%" stopColor="#e2e8f0" />
                  </linearGradient>
                </defs>
                <path
                  fill={`url(#half-${i})`}
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                />
              </>
            ) : (
              <path
                fill="#e2e8f0"
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            )}
          </svg>
        ))}
      </div>
      <span className="text-sm font-semibold text-white">
        {score.toFixed(1)}
      </span>
      {count > 0 && (
        <span className="text-xs text-slate-300">({count} recenzii)</span>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col gap-2 ${
        accent
          ? "bg-gradient-to-br from-[#123524] to-[#1a4d36] border-[#1a4d36] text-white"
          : "bg-white border-slate-100"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          accent ? "bg-white/10" : "bg-lime-50"
        }`}
      >
        <Icon
          className={`w-5 h-5 ${accent ? "text-lime-400" : "text-lime-600"}`}
        />
      </div>
      <div>
        <div
          className={`text-2xl font-black tracking-tight ${accent ? "text-white" : "text-slate-900"}`}
        >
          {value}
        </div>
        <div
          className={`text-xs font-medium mt-0.5 ${accent ? "text-white/70" : "text-slate-500"}`}
        >
          {label}
        </div>
        {sub && (
          <div
            className={`text-xs mt-0.5 ${accent ? "text-lime-300" : "text-lime-600"}`}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ user }: { user: UserProfile }) {
  const totalBottles = user.totalBottlesGiven + user.totalBottlesCollected;

  return (
    <div className="space-y-8">
      {/* Impact section */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4">
            <div className="text-6xl md:text-7xl font-black text-lime-600 mb-3">
              {totalBottles.toLocaleString("ro-RO")}{" "}
              <FaWineBottle className="inline-block w-14 h-14 md:w-16 md:h-16 -mt-2" />
            </div>
            <div className="text-lg md:text-xl text-slate-500 mt-1">
              sticle reciclate în total
            </div>
          </div>
          <div className="text-center p-4">
            <div className="text-6xl md:text-7xl font-black text-emerald-600 mb-3">
              {(totalBottles * 0.033).toFixed(1)} kg
            </div>
            <div className="text-lg md:text-xl text-slate-500 mt-1">
              plastic recuperat
            </div>
          </div>
          <div className="text-center p-4">
            <div className="text-6xl md:text-7xl font-black text-teal-600 mb-3">
              {(totalBottles * 0.12).toFixed(1)} kg
            </div>
            <div className="text-lg md:text-xl text-slate-500 mt-1">
              CO₂ redus
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={FaWineBottle}
          label="Sticle donate"
          value={user.totalBottlesGiven.toLocaleString("ro-RO")}
          sub={`~${(user.totalBottlesGiven * 0.5).toFixed(0)} RON valoare`}
        />
        <StatCard
          icon={LuBike}
          label="Sticle colectate"
          value={user.totalBottlesCollected.toLocaleString("ro-RO")}
        />
        <StatCard
          icon={Recycle}
          label="Tranzacții"
          value={user.totalTransactions.toLocaleString("ro-RO")}
          accent
        />
        <StatCard
          icon={ArrowUpRight}
          label="Total câștigat"
          value={`${user.totalEarned.toFixed(2)} RON`}
          sub={`+ ${user.totalSaved.toFixed(2)} RON economisite`}
        />
      </div>
    </div>
  );
}

// ─── Tab: Posts ───────────────────────────────────────────────────────────────

function PostsTab({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSWR(
    `/api/v1/profile/posts?page=${page}&limit=8`,
    fetcher,
  );

  if (isLoading) return <PostsSkeleton />;

  const posts: Post[] = data?.posts ?? [];

  if (posts.length === 0) {
    return (
      <EmptyState
        emoji="📦"
        title="Nicio postare încă"
        desc="Postează sticlele tale pentru a câștiga bani cu ușurință."
        href="/post"
        cta="Postează acum"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {posts.map((post) => {
          const cfg =
            POST_STATUS_CONFIG[post.status] ?? POST_STATUS_CONFIG.OPEN;
          const Icon = cfg.Icon;
          return (
            <div
              key={post.id}
              className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-lime-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}
                    >
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(post.createdAt).toLocaleDateString("ro-RO")}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {post.description}
                  </p>
                  {post.locationName && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        {post.locationName}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-black text-slate-900">
                    {post.bottleCount}
                  </div>
                  <div className="text-xs text-slate-400">sticle</div>
                  {post.transaction ? (
                    <div className="text-sm font-bold text-lime-600 mt-1">
                      +{post.transaction.posterEarning.toFixed(2)} RON
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400 mt-1">
                      ~{post.estimatedValue.toFixed(0)} RON est.
                    </div>
                  )}
                </div>
              </div>
              {post.collector && (
                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-lime-100 flex items-center justify-center overflow-hidden border border-lime-200">
                    {post.collector.image ? (
                      <Image
                        src={post.collector.image}
                        alt={post.collector.name ?? ""}
                        width={64}
                        height={64}
                        priority
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-lime-700">
                        {post.collector.name?.[0]}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    Colectat de{" "}
                    <span className="font-semibold text-slate-700">
                      {post.collector.name}
                    </span>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {data?.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

// ─── Tab: Transactions ────────────────────────────────────────────────────────

function TransactionsTab({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSWR(
    `/api/v1/profile/transactions?page=${page}&limit=8`,
    fetcher,
  );

  if (isLoading) return <TransactionsSkeleton />;

  const transactions: Transaction[] = data?.transactions ?? [];

  if (transactions.length === 0) {
    return (
      <EmptyState
        emoji="💸"
        title="Nicio tranzacție încă"
        desc="Tranzacțiile vor apărea după finalizarea primului schimb."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {transactions.map((t) => {
          const isPoster = t.posterId === userId;
          const other = isPoster ? t.collector : t.poster;
          const earning = isPoster ? t.posterEarning : t.collectorEarning;
          const myRating = isPoster ? t.collectorRating : t.posterRating;

          return (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-lime-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-lime-50 border border-lime-200 flex items-center justify-center overflow-hidden shrink-0">
                    {other?.image ? (
                      <Image
                        src={other.image}
                        alt={other.name ?? ""}
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold text-lime-700">
                        {other?.name?.[0] ?? "?"}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-900">
                      {other?.name ?? "Utilizator necunoscut"}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {t.post.locationName ?? "Locație necunoscută"}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {new Date(t.completedAt).toLocaleDateString("ro-RO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-black text-lime-600">
                    +{earning.toFixed(2)} RON
                  </div>
                  <div className="text-xs text-slate-500">
                    {t.bottleCount} sticle · {t.actualValue.toFixed(2)} RON
                    total
                  </div>
                  {myRating && (
                    <div className="flex items-center justify-end gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <svg key={i} className="w-3 h-3" viewBox="0 0 20 20">
                          <path
                            fill={i <= myRating ? "#a3e635" : "#e2e8f0"}
                            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                          />
                        </svg>
                      ))}
                      <span className="text-xs text-slate-400 ml-1">
                        primit
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-2 px-1">
                <p className="text-xs text-slate-500 italic truncate">
                  &quot;{t.post.description}&quot;
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {data?.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

// ─── Tab: Badges ──────────────────────────────────────────────────────────────

function BadgesTab() {
  const { data: badges = [], isLoading } = useSWR<Badge[]>(
    "/api/v1/profile/badges",
    fetcher,
  );

  const ALL_BADGE_TYPES = Object.keys(BADGE_CONFIG);
  const earnedTypes = new Set(badges.map((b) => b.type));

  if (isLoading) return <BadgesSkeleton />;

  return (
    <div className="space-y-6">
      {badges.length > 0 && (
        <p className="text-sm text-slate-500">
          Ai obținut{" "}
          <span className="font-bold text-lime-600">{badges.length}</span> din{" "}
          {ALL_BADGE_TYPES.length} badge-uri disponibile.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {ALL_BADGE_TYPES.map((type) => {
          const cfg = BADGE_CONFIG[type];
          const earned = earnedTypes.has(type);
          const badge = badges.find((b) => b.type === type);
          return (
            <div
              key={type}
              className={`rounded-2xl border p-4 flex flex-col items-center text-center transition-all ${
                earned
                  ? "bg-gradient-to-br from-lime-50 to-emerald-50 border-lime-200 shadow-sm"
                  : "bg-slate-50 border-slate-100 opacity-40 grayscale"
              }`}
            >
              <div
                className={`text-3xl mb-2 ${earned ? "" : "filter grayscale"}`}
              >
                {cfg.emoji}
              </div>
              <div className="font-bold text-sm text-slate-900">
                {cfg.label}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{cfg.desc}</div>
              {badge && (
                <div className="text-xs text-lime-600 font-semibold mt-2">
                  {new Date(badge.earnedAt).toLocaleDateString("ro-RO")}
                </div>
              )}
              {!earned && (
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
}

// ─── Tab: Notifications ───────────────────────────────────────────────────────

function NotificationsTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading, mutate } = useSWR(
    `/api/v1/profile/notifications?page=${page}&limit=12`,
    fetcher,
  );

  const markAllRead = async () => {
    await fetch("/api/v1/profile/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    mutate();
  };

  if (isLoading) return <NotificationsSkeleton />;

  const notifications: Notification[] = data?.notifications ?? [];

  if (notifications.length === 0) {
    return (
      <EmptyState
        emoji="🔔"
        title="Nicio notificare"
        desc="Vei primi notificări când cineva interacționează cu postările tale."
      />
    );
  }

  return (
    <div className="space-y-4">
      {data?.unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            <span className="font-bold text-slate-800">{data.unreadCount}</span>{" "}
            necitite
          </span>
          <button
            onClick={markAllRead}
            className="text-sm font-semibold text-lime-600 hover:text-lime-700 transition-colors"
          >
            Marchează toate ca citite
          </button>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`rounded-2xl border p-4 flex gap-3 transition-all ${
              !n.read
                ? "bg-lime-50/50 border-lime-200"
                : "bg-white border-slate-100"
            }`}
          >
            <div className="text-xl shrink-0 mt-0.5">
              {NOTIF_ICON[n.type] ?? "🔔"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm text-slate-900">
                  {n.title}
                </p>
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-lime-500 shrink-0 mt-1.5" />
                )}
              </div>
              <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
              <p className="text-xs text-slate-400 mt-1">
                {new Date(n.createdAt).toLocaleDateString("ro-RO", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {data?.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function PostsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-100 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <div className="h-5 w-20 bg-slate-100 rounded-full" />
                <div className="h-5 w-16 bg-slate-100 rounded-full" />
              </div>
              <div className="h-4 w-3/4 bg-slate-100 rounded-lg" />
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 bg-slate-100 rounded-full" />
                <div className="h-3 w-1/3 bg-slate-100 rounded-lg" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="h-7 w-8 bg-slate-100 rounded-lg" />
              <div className="h-3 w-10 bg-slate-100 rounded-lg" />
              <div className="h-4 w-16 bg-slate-100 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TransactionsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-100 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
              <div className="space-y-2">
                <div className="h-4 w-24 bg-slate-100 rounded-lg" />
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-slate-100 rounded-full" />
                  <div className="h-3 w-28 bg-slate-100 rounded-lg" />
                </div>
                <div className="h-3 w-20 bg-slate-100 rounded-lg" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="h-6 w-20 bg-slate-100 rounded-lg" />
              <div className="h-3 w-28 bg-slate-100 rounded-lg" />
              <div className="flex gap-0.5 mt-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div key={s} className="w-3 h-3 bg-slate-100 rounded-sm" />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 h-3 w-2/3 bg-slate-100 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function BadgesSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 animate-pulse">
      {Array.from({ length: 12 }).map((_, i) => (
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
  );
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`rounded-2xl border p-4 flex gap-3 ${
            i <= 2
              ? "bg-lime-50/50 border-lime-100"
              : "bg-white border-slate-100"
          }`}
        >
          <div className="w-8 h-8 bg-slate-100 rounded-full shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="h-4 w-1/3 bg-slate-100 rounded-lg" />
              {i <= 2 && (
                <div className="w-2 h-2 rounded-full bg-lime-200 shrink-0 mt-1" />
              )}
            </div>
            <div className="h-3 w-3/4 bg-slate-100 rounded-lg" />
            <div className="h-3 w-16 bg-slate-100 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function EmptyState({
  emoji,
  title,
  desc,
  href,
  cta,
}: {
  emoji: string;
  title: string;
  desc: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="text-center py-16 space-y-3">
      <div className="text-5xl">{emoji}</div>
      <p className="font-bold text-slate-900 text-lg">{title}</p>
      <p className="text-slate-500 text-sm max-w-xs mx-auto">{desc}</p>
      {href && cta && (
        <a
          href={href}
          className="inline-flex items-center gap-2 mt-2 bg-[#123524] text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-[#1a4d36] transition-colors"
        >
          {cta} <ChevronRight className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        ← Anterior
      </button>
      <span className="text-sm text-slate-500">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        Următor →
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Rezumat", icon: User },
  { id: "posts", label: "Postări", icon: FaWineBottle },
  { id: "transactions", label: "Tranzacții", icon: ArrowUpRight },
  { id: "badges", label: "Badge-uri", icon: Trophy },
  { id: "notifications", label: "Notificări", icon: Bell },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ProfileClient({ user }: { user: UserProfile }) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const memberSince = new Date(user.createdAt).toLocaleDateString("ro-RO", {
    month: "long",
    year: "numeric",
  });

  const totalBottles = user.totalBottlesGiven + user.totalBottlesCollected;

  return (
    <div className="w-full">
      {/* ── Profile Header ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#123424] to-[#1a4d36] rounded-[2rem] mx-4 sm:mx-6 lg:mx-8 mt-4 mb-6 px-6 sm:px-10 py-6 sm:py-8 relative overflow-hidden shadow">
        {/* Decorative blobs */}
        <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-lime-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Always-inline row: avatar + info */}
        <div className="relative flex flex-row items-center gap-4 sm:gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? "Profil"}
                width={96}
                height={96}
                className="w-18 h-18 sm:w-28 sm:h-28 rounded-full object-cover border-3 border-lime-400/70 shadow-lg"
              />
            ) : (
              <div className="w-14 h-14 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center text-black font-black text-xl sm:text-3xl border-4 border-lime-400/60 shadow-lg">
                {initials ?? <User className="w-7 h-7 sm:w-10 sm:h-10" />}
              </div>
            )}
            {user.role === "ADMIN" && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-400 flex items-center justify-center border-2 border-[#123524]">
                <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-black" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <h1 className="text-lg sm:text-3xl font-extrabold text-white tracking-tight truncate">
                {user.name ?? "Utilizator"}
              </h1>
            </div>

            <p className="text-white/60 text-xs sm:text-sm mb-2 sm:mb-3 truncate">
              {user.email}
            </p>

            <StarRating score={user.reputationScore} count={user.ratingCount} />

            {/* Stats row — hidden on mobile, shown on sm+ */}
            <div className="hidden sm:flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-1.5 text-white/70 text-sm">
                <FaWineBottle className="w-4 h-4 text-lime-400" />
                <span className="font-bold text-white">
                  {totalBottles}
                </span>{" "}
                sticle reciclate
              </div>
              <div className="flex items-center gap-1.5 text-white/70 text-sm">
                <Trophy className="w-4 h-4 text-lime-400" />
                <span className="font-bold text-white">
                  {user._count.badges}
                </span>{" "}
                badge-uri
              </div>
              <div className="flex items-center gap-1.5 text-white/70 text-sm">
                <Calendar className="w-4 h-4 text-lime-400" />
                Membru din{" "}
                <span className="font-bold text-white ml-1">{memberSince}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row — mobile only, below the inline row */}
        <div className="relative flex sm:hidden flex-wrap gap-3 mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-white/70 text-xs">
            <FaWineBottle className="w-3.5 h-3.5 text-lime-400" />
            <span className="font-bold text-white">{totalBottles}</span> sticle
          </div>
          <div className="flex items-center gap-1.5 text-white/70 text-xs">
            <Trophy className="w-3.5 h-3.5 text-lime-400" />
            <span className="font-bold text-white">
              {user._count.badges}
            </span>{" "}
            badge-uri
          </div>
          <div className="flex items-center gap-1.5 text-white/70 text-xs">
            <Calendar className="w-3.5 h-3.5 text-lime-400" />
            <span className="font-bold text-white">{memberSince}</span>
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex gap-1 overflow-x-auto scrollbar-none mb-6 pb-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 border text-sm text-[#123524] font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                activeTab === id
                  ? "text-[#123524] border-lime-700/50 bg-lime-50/50"
                  : "text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {id === "notifications" && <NotifBadge userId={user.id} />}
            </button>
          ))}
        </div>

        {/* ── Tab content ─────────────────────────────────────────────────── */}
        <div className="pb-12">
          {activeTab === "overview" && <OverviewTab user={user} />}
          {activeTab === "posts" && <PostsTab userId={user.id} />}
          {activeTab === "transactions" && <TransactionsTab userId={user.id} />}
          {activeTab === "badges" && <BadgesTab />}
          {activeTab === "notifications" && <NotificationsTab />}
        </div>
      </div>
    </div>
  );
}

function NotifBadge({ userId }: { userId: string }) {
  const { data } = useSWR(
    "/api/v1/profile/notifications?page=1&limit=1",
    fetcher,
    { refreshInterval: 30000 },
  );
  if (!data?.unreadCount) return null;
  return (
    <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
      {data.unreadCount > 9 ? "9+" : data.unreadCount}
    </span>
  );
}
