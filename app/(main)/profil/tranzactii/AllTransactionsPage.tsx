"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import useSWR from "swr";

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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ROLE_FILTERS = [
  { value: "all", label: "Toate" },
  { value: "poster", label: "Ca poster" },
  { value: "collector", label: "Ca colector" },
];

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
    <div className="flex items-center justify-center gap-2 pt-4">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        ← Anterior
      </button>
      <span className="text-sm text-slate-500 font-medium">
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

export default function AllTransactionsPage({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("all");

  const apiUrl = `/api/v1/profile/transactions?page=${page}&limit=10&side=${roleFilter}`;
  const { data, isLoading } = useSWR(apiUrl, fetcher);

  const transactions: Transaction[] = data?.transactions ?? [];
  const totalPages: number = data?.totalPages ?? 1;

  const handleFilterChange = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 min-h-[100dvh]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/profil"
          className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Tranzacțiile mele
          </h1>
        </div>
      </div>

      {/* Role filter pills */}
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
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <Skeleton />
      ) : transactions.length === 0 ? (
        <div className="text-center py-16">
          <Image
            src="/images/bottle-sad.svg"
            alt="Nicio postare"
            width={64}
            height={64}
            priority
            className="mx-auto h-24 w-24"
          />
          <p className="font-bold text-slate-900 text-lg mb-2">
            Nicio tranzacție găsită
          </p>
          <p className="text-slate-500 text-sm">
            {roleFilter == "all" &&
              "Tranzacțiile vor apărea după finalizarea primului schimb."}
          </p>
        </div>
      ) : (
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
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
