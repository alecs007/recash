"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { Pagination } from "@/app/components/UI/Pagination";
import { PageTransition } from "@/app/components/UI/PageTransition";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { useI18n, type Locale } from "@/context/I18nContext";

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

const ROLE_FILTERS = [
  { value: "all", label: { ro: "Toate", en: "All" } },
  { value: "poster", label: { ro: "Drept autor", en: "As author" } },
  { value: "collector", label: { ro: "Drept colector", en: "As collector" } },
];

function getEmptyTitle(filter: string, locale: Locale) {
  const map: Record<string, { ro: string; en: string }> = {
    poster: {
      ro: "Nicio tranzacție drept autor",
      en: "No transactions as author",
    },
    collector: {
      ro: "Nicio tranzacție drept colector",
      en: "No transactions as collector",
    },
    all: { ro: "Nicio tranzacție găsită", en: "No transactions found" },
  };
  return (map[filter] ?? map.all)[locale];
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className="w-2.5 h-2.5" viewBox="0 0 20 20">
          <path
            fill={i <= rating ? "#FFDF00" : "#e2e8f0"}
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-100 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
              <div className="space-y-2">
                <div className="h-4 w-24 bg-slate-100 rounded-lg" />
                <div className="h-3 w-28 bg-slate-100 rounded-lg" />
                <div className="h-3 w-20 bg-slate-100 rounded-lg" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="h-6 w-20 bg-slate-100 rounded-lg" />
              <div className="h-3 w-28 bg-slate-100 rounded-lg" />
            </div>
          </div>
          <div className="mt-3 h-3 w-2/3 bg-slate-100 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default function AllTransactionsPage({ userId }: { userId: string }) {
  const { t: tr, fmt, locale } = useI18n();
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("all");

  const buildUrl = useCallback(
    (p: number) =>
      `/api/v1/profile/transactions?page=${p}&limit=10&side=${roleFilter}`,
    [roleFilter],
  );
  const { data, isInitialLoading, isPageLoading, totalPages } =
    usePaginatedList<{
      transactions: Transaction[];
      totalPages: number;
    }>(buildUrl, page);

  const transactions: Transaction[] = data?.transactions ?? [];

  const handleFilterChange = (value: string) => {
    setRoleFilter(value);
    setPage(1);
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
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {tr({ ro: "Tranzacțiile mele", en: "My transactions" })}
          </h1>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        {ROLE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              roleFilter === f.value
                ? "bg-[#123424] text-white border-[#123424]"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {tr(f.label)}
          </button>
        ))}
      </div>
      <PageTransition page={isInitialLoading ? -1 : `${roleFilter}:${page}`}>
        {isInitialLoading ? (
          <Skeleton />
        ) : transactions.length === 0 ? (
          <div className="text-center py-16">
            <Image
              src="/images/bottle-sad.svg"
              alt={tr({ ro: "Nicio tranzacție", en: "No transactions" })}
              width={64}
              height={64}
              priority
              className="mx-auto h-24 w-24"
            />
            <p className="font-bold text-slate-900 text-lg mb-2">
              {getEmptyTitle(roleFilter, locale)}
            </p>
            <p className="text-slate-500 text-sm">
              {roleFilter === "all"
                ? tr({
                    ro: "Tranzacțiile vor apărea după finalizarea primului schimb.",
                    en: "Transactions will appear after your first completed exchange.",
                  })
                : roleFilter === "poster"
                  ? tr({
                      ro: "Nu ai finalizat niciun schimb drept autor.",
                      en: "You haven't completed any exchange as an author.",
                    })
                  : tr({
                      ro: "Nu ai finalizat niciun schimb drept colector.",
                      en: "You haven't completed any exchange as a collector.",
                    })}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className={`space-y-3 transition-opacity ${
                isPageLoading ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              {transactions.map((t) => {
              const isPoster = t.posterId === userId;
              const other = isPoster ? t.collector : t.poster;
              const earning = isPoster ? t.posterEarning : t.collectorEarning;

              const ratingIGave = isPoster ? t.posterRating : t.collectorRating;
              const ratingIReceived = isPoster
                ? t.collectorRating
                : t.posterRating;

              return (
                <Link
                  key={t.id}
                  href={`/post/${t.post.id}`}
                  className="block bg-white rounded-2xl border border-slate-100 p-4 hover:border-lime-200 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* ADDED flex-1 min-w-0 to allow text column to shrink */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
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

                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-slate-900 truncate">
                          {other?.name ??
                            tr({
                              ro: "Utilizator necunoscut",
                              en: "Unknown user",
                            })}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {t.post.locationName ??
                              tr({
                                ro: "Locație necunoscută",
                                en: "Unknown location",
                              })}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {new Date(t.completedAt).toLocaleDateString(
                            locale === "ro" ? "ro-RO" : "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg font-black text-lime-600">
                        {fmt(earning, { sign: true })}
                      </div>
                      <div className="text-xs text-slate-500">
                        {t.bottleCount} {tr({ ro: "sticle", en: "bottles" })} |{" "}
                        {fmt(t.actualValue)}
                      </div>

                      <div className="flex flex-col items-end gap-1 mt-1.5">
                        {ratingIReceived !== null &&
                          ratingIReceived !== undefined && (
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-slate-400 font-medium">
                                Rating-ul primit
                              </span>
                              <Stars rating={ratingIReceived} />
                            </div>
                          )}
                        {ratingIGave !== null && ratingIGave !== undefined && (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-slate-400 font-medium">
                              Rating-ul tău
                            </span>
                            <Stars rating={ratingIGave} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
            </div>
            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            )}
          </div>
        )}
      </PageTransition>
    </div>
  );
}
