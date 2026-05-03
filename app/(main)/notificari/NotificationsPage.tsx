"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, BellOff, CheckCheck, Loader2 } from "lucide-react";
import useSWR, { mutate } from "swr";
import { NOTIF_CONFIG } from "@/lib/constants/notifications";
import { Notification } from "@prisma/client";

type ApiResponse = {
  notifications: Notification[];
  total: number;
  page: number;
  totalPages: number;
  unreadCount: number;
};

const FILTERS = [
  { value: "all", label: "Toate" },
  { value: "unread", label: "Necitite" },
];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function timeAgo(dateStr: Date): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "acum";
  if (mins < 60) return `acum ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `acum ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `acum ${days}z`;
  return new Date(dateStr).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
  });
}

function NotificationCard({
  notif,
  onClick,
}: {
  notif: Notification;
  onClick: (id: string) => void;
}) {
  const cfg = NOTIF_CONFIG[notif.type] ?? NOTIF_CONFIG.SYSTEM;
  const Icon = cfg.Icon;

  const inner = (
    <div
      className={`relative flex items-start gap-3 p-4 rounded-2xl border transition-all
        ${
          notif.read
            ? "bg-white border-slate-100 hover:border-slate-200"
            : "bg-lime-50 border-lime-300 hover:border-lime-300"
        }`}
      onClick={() => onClick(notif.id)}
    >
      {!notif.read && (
        <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-lime-400 shadow shadow-lime-300" />
      )}

      <div
        className={`shrink-0 w-10 h-10 rounded-full border flex items-center justify-center ${cfg.bg} ${cfg.border}`}
      >
        <Icon className={`w-4 h-4 ${cfg.color}`} />
      </div>

      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm font-semibold leading-snug ${notif.read ? "text-slate-700" : "text-slate-900"}`}
          >
            {notif.title}
          </p>
          <span className="shrink-0 text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
            {timeAgo(notif.createdAt)}
          </span>
        </div>
        <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
          {notif.message}
        </p>
      </div>
    </div>
  );

  if (notif.link) {
    return (
      <Link href={notif.link} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

function Skeleton() {
  return (
    <div className="space-y-2.5 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-4 rounded-2xl border border-slate-100 bg-white"
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="flex justify-between gap-4">
              <div className="h-3.5 w-40 bg-slate-100 rounded-lg" />
              <div className="h-3 w-10 bg-slate-100 rounded-lg" />
            </div>
            <div className="h-3 w-3/4 bg-slate-100 rounded-lg" />
            <div className="h-3 w-1/2 bg-slate-100 rounded-lg" />
          </div>
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

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [markingAll, setMarkingAll] = useState(false);

  const apiUrl = `/api/v1/profile/notifications?page=${page}&limit=15${filter === "unread" ? "&unread=true" : ""}`;

  const {
    data,
    isLoading,
    mutate: revalidate,
  } = useSWR<ApiResponse>(apiUrl, fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  });

  const notifications = data?.notifications ?? [];
  const totalPages = data?.totalPages ?? 1;
  const unreadCount = data?.unreadCount ?? 0;

  const handleMarkRead = async (id: string) => {
    if (data?.notifications.find((n) => n.id === id)?.read) return; // already read
    await fetch("/api/v1/profile/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    await revalidate();
    // Revalidate header bell count too
    await mutate(
      (key: unknown) =>
        typeof key === "string" &&
        key.includes("/api/v1/profile/notifications"),
    );
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    await fetch("/api/v1/profile/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    await revalidate();
    // Revalidate header bell count too
    await mutate(
      (key: unknown) =>
        typeof key === "string" &&
        key.includes("/api/v1/profile/notifications"),
    );
    setMarkingAll(false);
  };

  const handleFilterChange = (val: "all" | "unread") => {
    setFilter(val);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 min-h-[100dvh]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Notificări
            </h1>
          </div>
        </div>

        {isLoading ? (
          <div className="h-8 w-45 bg-slate-100 animate-pulse rounded-xl" />
        ) : (
          unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-transparent hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-50 cursor-pointer"
            >
              {markingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5" />
              )}
              Marchează toate ca citite
            </button>
          )
        )}
      </div>

      <div className="flex gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value as "all" | "unread")}
            className={`flex items-center whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              filter === f.value
                ? "bg-[#123424] text-white border-[#123424]"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {f.label}

            {f.value === "unread" &&
              (isLoading ? (
                <span className="ml-1.5 w-4 h-3.5 bg-slate-200 animate-pulse rounded-full" />
              ) : (
                unreadCount > 0 && (
                  <span className="ml-1.5 bg-lime-400 text-[#123424] text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )
              ))}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton />
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            {filter === "unread" ? (
              <BellOff className="w-7 h-7 text-slate-400" />
            ) : (
              <Bell className="w-7 h-7 text-slate-400" />
            )}
          </div>
          <p className="font-bold text-slate-900 text-lg mb-1">
            {filter === "unread"
              ? "Nicio notificare necitită"
              : "Nicio notificare"}
          </p>
          <p className="text-sm text-slate-500">
            {filter === "unread"
              ? "Ești la curent cu tot ce se întâmplă."
              : "Notificările vor apărea după prima activitate."}
          </p>
        </div>
      ) : (
        <div>
          <div className="space-y-2.5">
            {notifications.map((notif) => (
              <NotificationCard
                key={notif.id}
                notif={notif}
                onClick={handleMarkRead}
              />
            ))}
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
    </div>
  );
}
