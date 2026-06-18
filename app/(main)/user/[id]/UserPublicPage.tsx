"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ArrowLeft,
  Calendar,
  Trophy,
  Star,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { FaWineBottle, FaBan } from "react-icons/fa";
import { ProfileRankBadge } from "@/app/components/Profile/RankBadge";
import { BadgeCard } from "@/app/components/UI/BadgeCard";
import { BADGE_CONFIG } from "@/lib/constants/badges";
import { VerifiedBadge } from "@/app/components/UI/VerifiedBadge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const REVIEWS_PER_PAGE = 3;

interface PublicUser {
  id: string;
  name: string | null;
  image: string | null;
  certified: boolean;
  createdAt: string;
  totalBottlesGiven: number;
  totalBottlesCollected: number;
  totalTransactions: number;
  totalEarned: number;
  totalSaved: number;
  reputationScore: number;
  ratingCount: number;
  cancelledCount: number;
  _count: { posts: number; claimedPosts: number; badges: number };
}

interface PublicBadge {
  id: string;
  type: string;
  earnedAt: string;
}

interface Review {
  id: string;
  rating: number;
  review: string | null;
  reviewer: {
    id: string | undefined;
    name: string | null | undefined;
    image: string | null | undefined;
    certified: boolean | undefined;
  };
  role: "poster" | "collector";
  bottleCount: number;
  locationName: string | null;
  completedAt: string;
}

interface PublicProfileData {
  user: PublicUser;
  badges: PublicBadge[];
  reviews: Review[];
}

function RatingBreakdown({ reviews }: { reviews: Review[] }) {
  const counts = useMemo(() => {
    const c = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) c[r.rating - 1]++;
    });
    return c;
  }, [reviews]);

  const total = reviews.length;
  const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;

  if (total === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-5">
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center shrink-0">
          <span className="text-5xl font-black text-slate-900 leading-none">
            {avg.toFixed(1)}
          </span>
          <div className="flex gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <svg key={i} className="w-4 h-4" viewBox="0 0 20 20">
                <path
                  fill={i <= Math.round(avg) ? "#FFDF00" : "#e2e8f0"}
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                />
              </svg>
            ))}
          </div>
          <span className="text-xs text-slate-400 mt-1">
            {total} {total === 1 ? "recenzie" : "recenzii"}
          </span>
        </div>

        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = counts[star - 1];
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-slate-400 w-3 text-right">
                  {star}
                </span>
                <svg
                  className="w-3 h-3 text-[#FFDF00] fill-[#FFDF00] shrink-0"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FFDF00] rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 w-4 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  profileUserId,
}: {
  review: Review;
  profileUserId: string;
}) {
  const { reviewer } = review;
  const canLink = reviewer.id && reviewer.id !== profileUserId;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-lime-200 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        {canLink ? (
          <Link href={`/user/${reviewer.id}`} className="shrink-0">
            <div className="w-10 h-10 rounded-full bg-lime-50 border border-lime-200 flex items-center justify-center overflow-hidden transition-all">
              {reviewer.image ? (
                <Image
                  src={reviewer.image}
                  alt={reviewer.name ?? ""}
                  width={120}
                  height={120}
                  className="object-cover"
                  draggable={false}
                />
              ) : (
                <span className="text-sm font-bold text-lime-700">
                  {reviewer.name?.[0] ?? "?"}{" "}
                </span>
              )}
            </div>
          </Link>
        ) : (
          <div className="shrink-0 w-10 h-10 rounded-full bg-lime-50 border border-lime-200 flex items-center justify-center overflow-hidden">
            {reviewer.image ? (
              <Image
                src={reviewer.image}
                alt={reviewer.name ?? ""}
                width={40}
                height={40}
                className="object-cover"
                draggable={false}
              />
            ) : (
              <span className="text-sm font-bold text-lime-700">
                {reviewer.name?.[0] ?? "?"}
              </span>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              {canLink ? (
                <Link
                  href={`/user/${reviewer.id}`}
                  className="font-semibold text-sm text-slate-900 hover:text-lime-700 transition-colors flex items-center gap-1"
                >
                  {reviewer.name ?? "Utilizator"}{" "}
                  {reviewer.certified && (
                    <VerifiedBadge className="w-4 h-4 shrink-0" />
                  )}
                </Link>
              ) : (
                <span className="font-semibold text-sm text-slate-900 flex items-center gap-1">
                  {reviewer.name ?? "Utilizator"}{" "}
                  {reviewer.certified && (
                    <VerifiedBadge className="w-4 h-4 shrink-0" />
                  )}
                </span>
              )}
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className="w-4 h-4" viewBox="0 0 20 20">
                      <path
                        fill={i <= review.rating ? "#FFDF00" : "#e2e8f0"}
                        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                      />
                    </svg>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-full">
                  {review.role === "poster"
                    ? "Autorul anunțului"
                    : "Colectorul sticlelor"}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">
              {new Date(review.completedAt).toLocaleDateString("ro-RO", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          {review.review && (
            <p className="text-sm text-slate-600 italic leading-relaxed mt-2">
              &quot;{review.review}&quot;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="w-full min-h-[100dvh] pb-12 animate-pulse">
      {/* Back button */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4 mb-3">
        <div className="h-4 w-16 bg-slate-100 rounded-full" />
      </div>

      {/* Hero card */}
      <div className="bg-slate-100 rounded-[2rem] mx-4 sm:mx-6 lg:mx-8 mb-6 px-6 sm:px-10 py-6 sm:py-8">
        <div className="flex flex-row items-center gap-4 sm:gap-6">
          <div className="w-[4.5rem] h-[4.5rem] sm:w-28 sm:h-28 rounded-full bg-slate-200 shrink-0" />
          <div className="flex-1 min-w-0 space-y-3">
            <div className="h-7 sm:h-9 w-48 bg-slate-200 rounded-xl" />
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="w-4 h-4 rounded-sm bg-slate-200" />
              ))}
              <div className="h-3.5 w-8 bg-slate-200 rounded" />
              <div className="h-3.5 w-20 bg-slate-200 rounded" />
            </div>
            <div className="hidden sm:flex gap-4">
              <div className="h-3.5 w-20 bg-slate-200 rounded" />
              <div className="h-3.5 w-28 bg-slate-200 rounded" />
              <div className="h-3.5 w-24 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
        <div className="flex sm:hidden gap-3 mt-4 pt-4 border-t border-slate-200">
          <div className="h-3 w-16 bg-slate-200 rounded" />
          <div className="h-3 w-24 bg-slate-200 rounded" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="mx-4 sm:mx-6 lg:mx-8 mb-8">
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border-b border-slate-100 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 shrink-0" />
                  <div className="h-3.5 w-24 bg-slate-100 rounded-lg" />
                </div>
                <div className="flex items-baseline gap-1">
                  <div className="h-5 w-10 bg-slate-100 rounded-lg" />
                  <div className="h-3 w-6 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews section */}
      <div className="mx-4 sm:mx-6 lg:mx-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-36 bg-slate-100 rounded-lg" />
          <div className="h-4 w-8 bg-slate-100 rounded" />
        </div>

        {/* Rating breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-5">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="h-12 w-14 bg-slate-100 rounded-xl" />
              <div className="flex gap-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-4 h-4 rounded-sm bg-slate-100" />
                ))}
              </div>
              <div className="h-3 w-16 bg-slate-100 rounded" />
            </div>
            <div className="flex-1 space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-slate-100 rounded" />
                  <div className="w-3 h-3 bg-slate-100 rounded-sm" />
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full" />
                  <div className="w-4 h-3 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Review cards */}
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-100 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-28 bg-slate-100 rounded-lg" />
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[0, 1, 2, 3, 4].map((j) => (
                            <div
                              key={j}
                              className="w-2.5 h-2.5 rounded-sm bg-slate-100"
                            />
                          ))}
                        </div>
                        <div className="h-3 w-14 bg-slate-100 rounded-full" />
                      </div>
                    </div>
                    <div className="h-3 w-16 bg-slate-100 rounded shrink-0" />
                  </div>
                  {i % 2 === 0 && (
                    <div className="space-y-1.5 mb-2">
                      <div className="h-3 w-full bg-slate-100 rounded" />
                      <div className="h-3 w-4/5 bg-slate-100 rounded" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="h-3 w-14 bg-slate-100 rounded" />
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Badges section */}
      <div className="mx-4 sm:mx-6 lg:mx-8 mt-8 p-4 sm:p-6 bg-slate-50 border border-slate-100 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-36 bg-slate-100 rounded-lg" />
          <div className="h-4 w-8 bg-slate-100 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-slate-100"
            >
              <div
                className="w-[52px] h-[59px] bg-slate-100"
                style={{
                  clipPath:
                    "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                }}
              />
              <div className="space-y-1 w-full flex flex-col items-center">
                <div className="h-2.5 w-14 bg-slate-100 rounded" />
                <div className="h-2 w-10 bg-slate-100 rounded" />
              </div>
              <div className="w-full pt-1.5 border-t border-slate-100 flex justify-center">
                <div className="h-2 w-12 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UserPublicPage({ userId }: { userId: string }) {
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(REVIEWS_PER_PAGE);

  const { data, isLoading, error } = useSWR<PublicProfileData>(
    `/api/v1/users/${userId}`,
    fetcher,
  );

  const { data: rankData } = useSWR<{ rank: number; totalBottles: number }>(
    `/api/v1/leaderboard?userId=${userId}`,
    fetcher,
  );

  if (isLoading) return <Skeleton />;

  if (error || !data?.user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-slate-300" />
        </div>
        <p className="font-bold text-slate-700 text-lg">
          Utilizator inexistent
        </p>
        <p className="text-sm text-slate-400 text-center">
          Profilul nu există sau a fost eliminat.
        </p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Înapoi
        </button>
      </div>
    );
  }

  const { user, badges, reviews } = data;

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
  const totalEarning = user.totalEarned + user.totalSaved;

  const earnedBadges = badges.filter((b) => BADGE_CONFIG[b.type]);
  const visibleReviews = reviews.slice(0, visibleCount);
  const hasMore = visibleCount < reviews.length;

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
    <div className="w-full min-h-[100dvh] pb-12">
      <div className="px-4 sm:px-6 lg:px-8 pt-4 mb-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Înapoi
        </button>
      </div>
      <div className="bg-gradient-to-br from-[#123424] to-[#1a4d36] rounded-[2rem] mx-4 sm:mx-6 lg:mx-8 mb-6 px-6 sm:px-10 py-6 sm:py-8 relative overflow-hidden shadow">
        <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-lime-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-row items-center gap-4 sm:gap-6">
          <div className="relative shrink-0">
            {user.image ? (
              <div className="relative w-18 h-18 sm:w-28 sm:h-28 shrink-0">
                <div className="absolute inset-0 rounded-full bg-slate-200" />
                <Image
                  src={user.image}
                  alt={user.name ?? "Profil"}
                  fill
                  sizes="(min-width: 640px) 7rem, 4.5rem"
                  priority
                  className="rounded-2xl sm:rounded-3xl object-cover border-2 sm:border-3 border-lime-400 shadow-lg z-10"
                  draggable={false}
                />
              </div>
            ) : (
              <div className="w-18 h-18 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center text-black font-black text-xl sm:text-3xl border-3 border-lime-400/60 shadow-lg">
                {initials ?? "?"}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-3xl font-extrabold text-white tracking-tight truncate mb-0.5 flex items-center gap-1">
              {user.name ?? "Utilizator"}
              {user.certified && (
                <VerifiedBadge className="w-5 h-5 sm:w-7 sm:h-7 shrink-0" />
              )}
            </h1>

            <div className="flex flex-wrap items-center gap-1.5 mb-2 sm:mb-3">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => {
                  const full = Math.floor(user.reputationScore);
                  const half = user.reputationScore - full >= 0.5;
                  return (
                    <svg key={i} className="w-4 h-4" viewBox="0 0 20 20">
                      {i <= full ? (
                        <path
                          fill="#FFDF00"
                          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                        />
                      ) : i === full + 1 && half ? (
                        <>
                          <defs>
                            <linearGradient id={`h${i}`}>
                              <stop offset="50%" stopColor="#FFDF00" />
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
                  );
                })}
              </div>
              <span className="text-sm font-semibold text-white">
                {user.reputationScore.toFixed(1)}
              </span>
              {user.ratingCount > 0 && (
                <span className="text-xs text-slate-300">
                  ({user.ratingCount}{" "}
                  {user.ratingCount === 1 ? "recenzie" : "recenzii"})
                </span>
              )}
              {user.cancelledCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-400 px-2">
                  <FaBan className="w-3 h-3" /> {user.cancelledCount}{" "}
                  {user.cancelledCount === 1 ? "anulare" : "anulări"} în progres
                </span>
              )}
            </div>

            {/* Desktop meta row */}
            <div className="hidden sm:flex flex-wrap gap-4">
              {rankData?.rank && (rankData.totalBottles ?? 0) > 0 && (
                <ProfileRankBadge
                  rank={rankData.rank}
                  totalBottles={rankData.totalBottles}
                />
              )}
              <div className="flex items-center text-white/70 text-sm">
                <Trophy className="w-4 h-4 text-lime-400 mr-1.5" />
                <span className="font-bold text-white mr-1">
                  {user._count.badges}
                </span>
                {user._count.badges === 1 ? "badge" : "badge-uri"}
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
                </span>
                sticle reciclate
              </div>
            </div>
          </div>
        </div>

        {/* Mobile meta row */}
        <div className="relative flex sm:hidden flex-wrap gap-3 mt-4 pt-4 border-t border-white/10">
          {rankData?.rank && (rankData.totalBottles ?? 0) > 0 ? (
            <ProfileRankBadge
              rank={rankData.rank}
              totalBottles={rankData.totalBottles}
            />
          ) : (
            <div className="flex items-center text-white/70 text-xs">
              <Trophy className="w-3.5 h-3.5 text-lime-400 mr-1.5" />
              <span className="font-bold text-white mr-1">
                {user._count.badges}
              </span>
              {user._count.badges === 1 ? "badge" : "badge-uri"}
            </div>
          )}
          <div className="flex items-center text-white/70 text-xs">
            <Calendar className="w-3.5 h-3.5 text-lime-400 mr-1.5" />
            <span className="mr-1">Membru din</span>
            <span className="font-bold text-white">{memberSince}</span>
          </div>
        </div>
      </div>
      <div className="mx-4 sm:mx-6 lg:mx-8 mb-8">
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-4">
            {stats.map(({ icon, label, value, unit }, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 border-b border-slate-100 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={icon}
                    alt={label}
                    width={24}
                    height={24}
                    priority
                    draggable={false}
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
      <div className="mx-4 sm:mx-6 lg:mx-8 mb-8">
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-4">
          Recenzii primite
          {reviews.length > 0 && (
            <span className="ml-2 text-base font-semibold text-slate-400">
              ({reviews.length})
            </span>
          )}
        </h2>

        {reviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
            <Star className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">
              Nicio recenzie primită
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Recenziile apar după finalizarea unei tranzacții
              colector-utilizator.
            </p>
          </div>
        ) : (
          <>
            <RatingBreakdown reviews={reviews} />

            <div className="space-y-3">
              {visibleReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  profileUserId={userId}
                />
              ))}
            </div>

            {hasMore && (
              <button
                onClick={() => setVisibleCount((c) => c + REVIEWS_PER_PAGE)}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-500 hover:border-lime-300 hover:text-lime-700 hover:bg-lime-50 transition-all cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
                Vezi mai multe ({reviews.length - visibleCount}{" "}
                {reviews.length - visibleCount === 1 ? "rămasă" : "rămase"})
              </button>
            )}
          </>
        )}
      </div>{" "}
      {earnedBadges.length > 0 && (
        <div className="mx-4 sm:mx-6 lg:mx-8 mb-8 p-4 sm:p-6 bg-slate-50 border border-slate-100 rounded-2xl">
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-4">
            Badge-uri obținute
            <span className="ml-2 text-sm font-semibold text-slate-400">
              ({earnedBadges.length})
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {earnedBadges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={{
                  ...badge,
                  seen: true,
                }}
                earned={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
