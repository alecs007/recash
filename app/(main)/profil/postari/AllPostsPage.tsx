"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  Plus,
} from "lucide-react";
import useSWR from "swr";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

const STATUS_FILTERS = [
  { value: "", label: "Toate" },
  { value: "active", label: "Active" },
  { value: "OPEN", label: "Deschise" },
  { value: "CLAIMED", label: "Revendicate" },
  { value: "IN_PROGRESS", label: "În desfășurare" },
  { value: "COMPLETED", label: "Finalizate" },
  { value: "CANCELLED", label: "Anulate" },
  { value: "EXPIRED", label: "Expirate" },
];

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: Post }) {
  const cfg = POST_STATUS_CONFIG[post.status] ?? POST_STATUS_CONFIG.OPEN;
  const Icon = cfg.Icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-lime-200 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}
            >
              <Icon className="w-3 h-3" />
              {cfg.label}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(post.createdAt).toLocaleDateString("ro-RO", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800 line-clamp-2">
            {post.description}
          </p>
          {post.locationName && (
            <div className="flex items-center gap-1 mt-1.5">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500 truncate">
                {post.locationName}
              </span>
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-black text-slate-900">
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PostsSkeleton() {
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

// ─── Pagination ───────────────────────────────────────────────────────────────

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AllPostsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const apiUrl = `/api/v1/profile/posts?page=${page}&limit=10${statusFilter ? `&status=${statusFilter}` : ""}`;
  const { data, isLoading } = useSWR(apiUrl, fetcher);

  const posts: Post[] = data?.posts ?? [];
  const totalPages: number = data?.totalPages ?? 1;
  const total: number = data?.total ?? 0;

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/profile"
          className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Postările mele
          </h1>
          {total > 0 && (
            <p className="text-sm text-slate-500">{total} postări totale</p>
          )}
        </div>
        <Link
          href="/post"
          className="ml-auto flex items-center gap-1.5 text-sm font-semibold bg-[#123424] text-white px-4 py-2 rounded-xl hover:bg-[#1a4d36] transition-colors"
        >
          <Plus className="w-4 h-4" /> Adaugă
        </Link>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              statusFilter === f.value
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
        <PostsSkeleton />
      ) : posts.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-5xl">📦</div>
          <p className="font-bold text-slate-900 text-lg">
            Nicio postare găsită
          </p>
          <p className="text-slate-500 text-sm">
            {statusFilter
              ? "Încearcă un alt filtru."
              : "Postează sticlele tale pentru a câștiga bani."}
          </p>
          {!statusFilter && (
            <Link
              href="/post"
              className="inline-flex items-center gap-2 mt-2 bg-[#123424] text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-[#1a4d36] transition-colors"
            >
              <Plus className="w-4 h-4" /> Postează acum
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
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
    </div>
  );
}
