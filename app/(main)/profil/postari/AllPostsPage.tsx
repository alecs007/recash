"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { PostCard } from "@/app/components/UI/PostCard";
import { Post } from "@/types";
import { Pagination } from "@/app/components/UI/Pagination";
import { PageTransition } from "@/app/components/UI/PageTransition";
import useSWR from "swr";
import { useI18n, type Locale } from "@/context/I18nContext";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_FILTERS = [
  { value: "all", label: { ro: "Toate", en: "All" } },
  { value: "active", label: { ro: "Active", en: "Active" } },
  { value: "COMPLETED", label: { ro: "Finalizate", en: "Completed" } },
  { value: "CANCELLED", label: { ro: "Anulate", en: "Cancelled" } },
  { value: "EXPIRED", label: { ro: "Expirate", en: "Expired" } },
];

function getStatusLabel(filter: string, count: number, locale: Locale) {
  const isSingular = count === 1;
  const ro = () => {
    switch (filter) {
      case "active":
        return isSingular ? "postare activă" : "postări active";
      case "COMPLETED":
        return isSingular ? "postare finalizată" : "postări finalizate";
      case "CANCELLED":
        return isSingular ? "postare anulată" : "postări anulate";
      case "EXPIRED":
        return isSingular ? "postare expirată" : "postări expirate";
      default:
        return isSingular ? "postare" : "postări";
    }
  };
  const en = () => {
    switch (filter) {
      case "active":
        return isSingular ? "active post" : "active posts";
      case "COMPLETED":
        return isSingular ? "completed post" : "completed posts";
      case "CANCELLED":
        return isSingular ? "cancelled post" : "cancelled posts";
      case "EXPIRED":
        return isSingular ? "expired post" : "expired posts";
      default:
        return isSingular ? "post" : "posts";
    }
  };
  return locale === "ro" ? ro() : en();
}

function getEmptyTitle(filter: string, locale: Locale) {
  const map: Record<string, { ro: string; en: string }> = {
    active: { ro: "Nicio postare activă", en: "No active posts" },
    COMPLETED: { ro: "Nicio postare finalizată", en: "No completed posts" },
    CANCELLED: { ro: "Nicio postare anulată", en: "No cancelled posts" },
    EXPIRED: { ro: "Nicio postare expirată", en: "No expired posts" },
    all: { ro: "Nicio postare găsită", en: "No posts found" },
  };
  return (map[filter] ?? map.all)[locale];
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
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <div className="h-5 w-24 bg-slate-100 rounded-full" />
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

export default function AllPostsPage() {
  const { t, locale } = useI18n();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const apiUrl = `/api/v1/profile/posts?page=${page}&limit=10${
    statusFilter !== "all" ? `&status=${statusFilter}` : ""
  }`;
  const { data, isLoading } = useSWR(apiUrl, fetcher);

  const posts: Post[] = data?.posts ?? [];
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.totalPages ?? 1;

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 min-h-[100dvh]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/profil"
            className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {t({ ro: "Postările mele", en: "My posts" })}
          </h1>
        </div>
        <Link
          href="/post"
          className="flex items-center gap-1.5 text-sm font-semibold bg-[#123424] text-white px-3 py-2 rounded-xl hover:bg-[#1a4d36] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {t({ ro: "Adaugă", en: "Add" })}
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              statusFilter === f.value
                ? "bg-[#123424] text-white border-[#123424]"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {t(f.label)}
          </button>
        ))}
      </div>

      <PageTransition page={isLoading ? -1 : page}>
        {isLoading ? (
          <Skeleton />
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <Image
              src="/images/bottle-sad.svg"
              alt={t({ ro: "Nicio postare", en: "No posts" })}
              width={64}
              height={64}
              priority
              className="mx-auto h-24 w-24"
            />
            <p className="font-bold text-slate-900 text-lg mb-1">
              {getEmptyTitle(statusFilter, locale)}
            </p>
            <p className="text-sm text-slate-500">
              {statusFilter === "all"
                ? t({
                    ro: "Postează sticlele tale pentru a câștiga bani.",
                    en: "Post your bottles to earn money.",
                  })
                : t({
                    ro: "Nu există postări cu acest status.",
                    en: "There are no posts with this status.",
                  })}
            </p>
            {statusFilter === "all" && (
              <Link
                href="/post"
                className="inline-flex items-center gap-2 bg-[#123424] text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-[#1a4d36] transition-colors mt-2"
              >
                <Plus className="w-4 h-4" />{" "}
                {t({ ro: "Postează acum", en: "Post now" })}
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 font-medium px-1">
              {total} {getStatusLabel(statusFilter, total, locale)}
            </p>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
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
