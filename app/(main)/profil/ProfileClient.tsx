"use client";

import Image from "next/image";
import Link from "next/link";
import {
  User,
  Trophy,
  Calendar,
  ChevronRight,
  MapPin,
  Plus,
} from "lucide-react";
import { FaWineBottle } from "react-icons/fa";
import { BADGE_COLORS, BADGE_CONFIG, type Badge } from "@/lib/constants/badges";
import useSWR from "swr";
import type { UserProfile, Post, Transaction } from "@/types";
import { POST_STATUS_CONFIG } from "@/lib/constants/posts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
                  <linearGradient id={`h${i}`}>
                    <stop offset="50%" stopColor="#a3e635" />
                    <stop offset="50%" stopColor="#e2e8f0" />
                  </linearGradient>
                </defs>
                <path
                  fill={`url(#h${i})`}
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

// ─── Stats Grid ───────────────────────────────────────────────────────────────

function StatsGrid({ user }: { user: UserProfile }) {
  const totalBottles = user.totalBottlesGiven + user.totalBottlesCollected;
  const totalEarning = user.totalEarned + user.totalSaved;

  const stats = [
    {
      icon: "/images/icons/bottles-recycled.svg",
      label: "Sticle reciclate",
      value: totalBottles.toLocaleString("ro-RO"),
      unit: "buc",
    },
    {
      icon: "/images/icons/total-earnings.svg",
      label: "Încasări totale",
      value: totalEarning.toFixed(2),
      unit: "RON",
    },
    {
      icon: "/images/icons/plastic.svg",
      label: "Plastic recuperat",
      value: `${totalBottles > 0 ? "~" : ""}${(totalBottles * 0.033).toFixed(1)}`,
      unit: "kg",
    },
    {
      icon: "/images/icons/co2-footprint.svg",
      label: "Amprentă CO₂",
      value: `${totalBottles > 0 ? "~" : ""}${(totalBottles * 0.12).toFixed(1)}`,
      unit: "kg CO₂ redus",
    },
  ];

  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mb-8">
      <div className="bg-white rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-4">
          {stats.map(({ icon, label, value, unit }, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 transition-colors border-b border-slate-100 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
            >
              <div className="flex items-center gap-3">
                <Image
                  src={icon}
                  alt={label}
                  width={24}
                  height={24}
                  priority
                  className="w-8 h-8 shrink-0"
                />
                <span className="text-sm font-medium text-slate-600">
                  {label}
                </span>
              </div>
              <div className="flex items-baseline gap-1 md:flex-col md:items-start md:gap-0 lg:flex-row lg:items-baseline lg:gap-1">
                <span className="text-lg font-black text-slate-900">
                  {value}
                </span>
                <span className="text-[10px] font-bold text-slate-600">
                  {unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  href,
  hrefLabel,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
        {title}
      </h2>
      {href && hrefLabel && (
        <Link
          href={href}
          className="flex items-center gap-1 text-sm font-semibold text-lime-700 hover:text-lime-800 transition-colors"
        >
          {hrefLabel}
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: Post }) {
  const cfg = POST_STATUS_CONFIG[post.status] ?? POST_STATUS_CONFIG.OPEN;
  const Icon = cfg.Icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-lime-200 hover:shadow-sm transition-all">
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
              ~{post.estimatedValue.toFixed(0)} RON
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
                width={24}
                height={24}
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
}

// ─── Latest Posts Section ─────────────────────────────────────────────────────

function LatestPostsSection() {
  const { data: allData, isLoading: loadingPosts } = useSWR(
    "/api/v1/profile/posts?limit=3&page=1",
    fetcher,
  );

  const posts: Post[] = allData?.posts ?? [];
  const totalPosts: number = allData?.total ?? 0;
  const hasMore = totalPosts > 3;

  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
          Postările mele
        </h2>
        <div className="flex items-center gap-2">
          {hasMore && (
            <Link
              href="/profil/postari"
              className="flex items-center gap-1 text-sm font-semibold text-lime-700 hover:text-lime-800 transition-colors"
            >
              Toate ({totalPosts})
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
          <Link
            href="/post"
            className="flex items-center gap-1.5 text-sm font-semibold bg-[#123424] text-white px-3 py-1.5 rounded-xl hover:bg-[#1a4d36] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Adaugă
          </Link>
        </div>
      </div>

      {loadingPosts ? (
        <PostsSkeleton count={3} />
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
          <Image
            src="/images/bottle-sad.svg"
            alt="Nicio postare"
            width={64}
            height={64}
            className="mx-auto h-24 w-24"
          />
          <p className="text-sm text-slate-900 mb-4">
            Încă nu ai creat nicio postare.
          </p>
          <Link
            href="/post"
            className="inline-flex items-center gap-2 bg-[#123424] text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-[#1a4d36] transition-colors"
          >
            <Plus className="w-4 h-4" /> Postează acum
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          {!hasMore && (
            <Link
              href="/profil/postari"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-slate-100 bg-white text-sm font-semibold text-slate-500 hover:border-lime-200 hover:text-lime-700 transition-all"
            >
              Toate postările <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Latest Transactions Section ──────────────────────────────────────────────

function LatestTransactionsSection({ userId }: { userId: string }) {
  const { data, isLoading } = useSWR(
    "/api/v1/profile/transactions?limit=3&page=1",
    fetcher,
  );

  const transactions: Transaction[] = data?.transactions ?? [];
  const total: number = data?.total ?? 0;

  if (isLoading) {
    return (
      <div className="mx-4 sm:mx-6 lg:mx-8 mb-8">
        <SectionHeader title="Tranzacții recente" />
        <TransactionsSkeleton count={3} />
      </div>
    );
  }

  if (transactions.length === 0) return null;

  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mb-8">
      <SectionHeader
        title="Tranzacții recente"
        href="/profil/tranzactii"
        hrefLabel={total > 3 ? `Vezi istoric (${total})` : "Vezi istoric"}
      />
      <div className="space-y-3">
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
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 italic truncate mt-2 px-1">
                &quot;{t.post.description}&quot;
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Badge Shield ─────────────────────────────────────────────────────────────

function ShieldBadge({
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
      className={`flex flex-col items-center gap-3 p-4 rounded-2xl bg-white border transition-colors
        ${earned ? "border-slate-200 hover:border-lime-400" : "border-slate-100 opacity-40 grayscale pointer-events-none"}`}
    >
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
      <div className="flex flex-col items-center gap-1 text-center w-full">
        <p className="text-[11px] font-bold text-slate-800 leading-tight">
          {cfg.label}
        </p>
        <p className="text-[9px] text-slate-400 leading-snug">{cfg.desc}</p>
      </div>
      <div className="w-full pt-2 border-t border-slate-100 text-center">
        <span className="text-[9px] font-semibold text-slate-400">
          {earnedAt
            ? new Date(earnedAt).toLocaleDateString("ro-RO", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "Neobținut"}
        </span>
      </div>
    </div>
  );
}

// ─── Badges Section ───────────────────────────────────────────────────────────

function BadgesSection() {
  const { data: badges = [], isLoading } = useSWR<Badge[]>(
    "/api/v1/profile/badges",
    fetcher,
  );
  const earnedBadges = badges.filter((b) => BADGE_CONFIG[b.type]);

  if (isLoading) {
    return (
      <div className="mx-4 sm:mx-6 lg:mx-8 mb-8">
        <SectionHeader title="Badge-urile mele" />
        <BadgesSkeleton count={4} />
      </div>
    );
  }

  if (earnedBadges.length === 0) return null;

  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mb-10">
      <SectionHeader
        title="Badge-urile mele"
        href="/profil/badges"
        hrefLabel="Vezi toate"
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {earnedBadges.map((badge) => (
          <ShieldBadge
            key={badge.id}
            type={badge.type}
            cfg={BADGE_CONFIG[badge.type]}
            earned
            earnedAt={badge.earnedAt}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function PostsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
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
              <div className="h-3 w-1/3 bg-slate-100 rounded-lg" />
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

function TransactionsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-100 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
              <div className="space-y-2">
                <div className="h-3.5 w-24 bg-slate-100 rounded-lg" />
                <div className="h-3 w-32 bg-slate-100 rounded-lg" />
                <div className="h-3 w-20 bg-slate-100 rounded-lg" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="h-6 w-20 bg-slate-100 rounded-lg" />
              <div className="h-3 w-28 bg-slate-100 rounded-lg" />
            </div>
          </div>
          <div className="mt-3 h-3 w-3/4 bg-slate-100 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function BadgesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-white"
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
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProfileClient({ user }: { user: UserProfile }) {
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
      {/* ── Profile Header ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#123424] to-[#1a4d36] rounded-[2rem] mx-4 sm:mx-6 lg:mx-8 mt-4 mb-6 px-6 sm:px-10 py-6 sm:py-8 relative overflow-hidden shadow">
        <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-lime-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-row items-center gap-4 sm:gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            {user.image ? (
              <div className="relative w-18 h-18 sm:w-28 sm:h-28 shrink-0">
                <div className="absolute inset-0 rounded-full bg-slate-200 animate-pulse" />

                {user.image && (
                  <Image
                    src={user.image}
                    alt="Profile"
                    fill
                    className="rounded-full object-cover border-3 border-lime-400/70 shadow-lg z-10"
                  />
                )}
              </div>
            ) : (
              <div className="w-18 h-18 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center text-black font-black text-xl sm:text-3xl border-3 border-lime-400/60 shadow-lg">
                {initials ?? <User className="w-7 h-7 sm:w-10 sm:h-10" />}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-3xl font-extrabold text-white tracking-tight truncate mb-0.5">
              {user.name ?? "Utilizator"}
            </h1>
            <p className="text-white/60 text-xs sm:text-sm mb-2 sm:mb-3 truncate">
              {user.email}
            </p>
            <StarRating score={user.reputationScore} count={user.ratingCount} />

            <div className="hidden sm:flex flex-wrap gap-4 mt-4">
              <div className="flex items-center text-white/70 text-sm">
                <Trophy className="w-4 h-4 text-lime-400 mr-1.5" />
                <span className="font-bold text-white mr-1">
                  {user._count.badges}
                </span>{" "}
                badge-uri
              </div>
              <div className="flex items-center text-white/70 text-sm">
                <Calendar className="w-4 h-4 text-lime-400 mr-1.5" />
                <span className="mr-1">Membru din</span>
                <span className="font-bold text-white">{memberSince}</span>
              </div>
              <div className="flex items-center text-white/70 text-sm">
                <FaWineBottle className="w-4 h-4 text-lime-400 mr-1.5" />
                <span className="font-bold text-white mr-1">
                  {totalBottles}
                </span>{" "}
                sticle reciclate
              </div>
            </div>
          </div>
        </div>

        {/* Mobile stats row */}
        <div className="relative flex sm:hidden flex-wrap gap-3 mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center text-white/70 text-xs">
            <Trophy className="w-3.5 h-3.5 text-lime-400 mr-1.5" />
            <span className="font-bold text-white mr-1">
              {user._count.badges}
            </span>{" "}
            badge-uri
          </div>
          <div className="flex items-center text-white/70 text-xs">
            <Calendar className="w-4 h-4 text-lime-400 mr-1.5" />
            <span className="mr-1">Membru din</span>
            <span className="font-bold text-white">{memberSince}</span>
          </div>
        </div>
      </div>

      <StatsGrid user={user} />
      <LatestPostsSection />
      <BadgesSection />
      <LatestTransactionsSection userId={user.id} />
    </div>
  );
}
