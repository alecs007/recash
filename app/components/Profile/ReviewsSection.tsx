"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { VerifiedBadge } from "../UI/VerifiedBadge";
import { useI18n } from "@/context/I18nContext";

export interface ProfileReview {
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

const REVIEWS_PER_PAGE = 3;

function RatingBreakdown({ reviews }: { reviews: ProfileReview[] }) {
  const { t } = useI18n();
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
    <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
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
            {total}{" "}
            {total === 1
              ? t({ ro: "recenzie", en: "review" })
              : t({ ro: "recenzii", en: "reviews" })}
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
  userId,
}: {
  review: ProfileReview;
  userId: string;
}) {
  const { t, locale } = useI18n();
  const { reviewer } = review;
  const canLink = reviewer.id && reviewer.id !== userId;

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
                  width={40}
                  height={40}
                  className="object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-lime-700">
                  {reviewer.name?.[0] ?? "?"}
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
                  className="font-semibold text-sm text-slate-900 hover:text-lime-700 transition-colors flex items-center gap-0.5"
                >
                  {reviewer.name ?? t({ ro: "Utilizator", en: "User" })}{" "}
                  {reviewer.certified && (
                    <VerifiedBadge className="w-4 h-4 shrink-0" />
                  )}
                </Link>
              ) : (
                <span className="font-semibold text-sm text-slate-900 flex items-center gap-0.5">
                  {reviewer.name ?? t({ ro: "Utilizator", en: "User" })}{" "}
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
                    ? t({ ro: "Autorul anunțului", en: "Listing author" })
                    : t({ ro: "Colectorul sticlelor", en: "Bottle collector" })}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">
              {new Date(review.completedAt).toLocaleDateString(
                locale === "ro" ? "ro-RO" : "en-GB",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                },
              )}
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

export function ReviewsSection({
  reviews,
  userId,
}: {
  reviews: ProfileReview[];
  userId: string;
}) {
  const { t } = useI18n();
  const [visibleCount, setVisibleCount] = useState(REVIEWS_PER_PAGE);

  if (reviews.length === 0) return null;

  const visibleReviews = reviews.slice(0, visibleCount);
  const hasMore = visibleCount < reviews.length;

  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
          {t({ ro: "Recenzii primite", en: "Reviews received" })}
          <span className="ml-2 text-base font-semibold text-slate-400">
            ({reviews.length})
          </span>
        </h2>
      </div>

      <RatingBreakdown reviews={reviews} />

      <div className="space-y-3">
        {visibleReviews.map((review) => (
          <ReviewCard key={review.id} review={review} userId={userId} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + REVIEWS_PER_PAGE)}
          className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-500 hover:border-lime-300 hover:text-lime-700 hover:bg-lime-50 transition-all cursor-pointer"
        >
          <ChevronDown className="w-4 h-4" />
          {t({
            ro: `Vezi mai multe (${reviews.length - visibleCount} ${
              reviews.length - visibleCount === 1 ? "rămasă" : "rămase"
            })`,
            en: `See more (${reviews.length - visibleCount} left)`,
          })}
        </button>
      )}
    </div>
  );
}
