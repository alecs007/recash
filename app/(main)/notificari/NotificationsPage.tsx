"use client";

import { useState, useLayoutEffect, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, BellOff, CheckCheck, Loader2 } from "lucide-react";
import { mutate as globalMutate } from "swr";
import { NOTIF_CONFIG } from "@/lib/constants/notifications";
import { Notification } from "@prisma/client";
import { Pagination } from "@/app/components/UI/Pagination";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { useRecashSocket } from "@/hooks/useRecashSocket";
import { useNotificationBell } from "@/hooks/useNotificationBell";
import { PageTransition } from "@/app/components/UI/PageTransition";
import { useI18n, type Locale } from "@/context/I18nContext";

type ApiResponse = {
  notifications: Notification[];
  total: number;
  page: number;
  totalPages: number;
  unreadCount: number;
};

const FILTERS = [
  { value: "all", label: { ro: "Toate", en: "All" } },
  { value: "unread", label: { ro: "Necitite", en: "Unread" } },
];

function timeAgo(dateStr: Date, locale: Locale): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return locale === "ro" ? "acum" : "now";
  if (mins < 60)
    return locale === "ro" ? `acum ${mins} min` : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24)
    return locale === "ro" ? `acum ${hours}h` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return locale === "ro" ? `acum ${days}z` : `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(
    locale === "ro" ? "ro-RO" : "en-GB",
    {
      day: "numeric",
      month: "short",
    },
  );
}

function NotificationCard({
  notif,
  onClick,
}: {
  notif: Notification;
  onClick: (id: string) => void;
}) {
  const { locale } = useI18n();
  const cfg = NOTIF_CONFIG[notif.type] ?? NOTIF_CONFIG.SYSTEM;
  const Icon = cfg.Icon;

  const inner = (
    <div
      onClick={() => onClick(notif.id)}
      className={`relative flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer
        ${
          notif.read
            ? "bg-white border-slate-100 hover:border-slate-200"
            : "bg-lime-50 border-lime-300 hover:border-lime-300"
        }`}
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
            {timeAgo(notif.createdAt, locale)}
          </span>
        </div>
        <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
          {notif.message}
        </p>
      </div>
    </div>
  );

  return notif.link ? (
    <Link href={notif.link} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
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

export default function NotificationsPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [markingAll, setMarkingAll] = useState(false);

  const { on, off } = useRecashSocket();
  // Reset the header bell's extra-unread counter when this page is open
  const { resetExtra } = useNotificationBell(true);

  useLayoutEffect(() => {
    resetExtra();
  }, [resetExtra]);

  const buildUrl = useCallback(
    (p: number) =>
      `/api/v1/profile/notifications?page=${p}&limit=15${filter === "unread" ? "&unread=true" : ""}`,
    [filter],
  );
  const {
    data,
    isInitialLoading,
    isPageLoading,
    totalPages,
    mutate: revalidate,
  } = usePaginatedList<ApiResponse>(buildUrl, page, {
    refreshInterval: 0, // WS drives updates
    revalidateOnFocus: true,
  });

  // When a new notification arrives via WS, refresh this list too
  const handleNewNotif = useCallback(() => {
    revalidate();
  }, [revalidate]);

  useEffect(() => {
    on("notification:new", handleNewNotif);
    return () => off("notification:new", handleNewNotif);
  }, [on, off, handleNewNotif]);

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const invalidateBell = () =>
    globalMutate(
      (key: unknown) =>
        typeof key === "string" &&
        key.includes("/api/v1/profile/notifications"),
    );

  const handleMarkRead = async (id: string) => {
    if (data?.notifications.find((n) => n.id === id)?.read) return;
    await fetch("/api/v1/profile/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    revalidate();
    invalidateBell();
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);

    revalidate(
      (current: ApiResponse | undefined) =>
        current
          ? {
              ...current,
              unreadCount: 0,
              notifications: current.notifications.map((n) => ({
                ...n,
                read: true,
              })),
            }
          : current,
      { revalidate: false },
    );

    await fetch("/api/v1/profile/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });

    revalidate();
    invalidateBell();
    setMarkingAll(false);
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
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {t({ ro: "Notificări", en: "Notifications" })}
          </h1>
        </div>

        {unreadCount > 0 && (
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
            {t({ ro: "Marchează toate ca citite", en: "Mark all as read" })}
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setFilter(f.value as "all" | "unread");
              setPage(1);
            }}
            className={`flex items-center whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              filter === f.value
                ? "bg-[#123424] text-white border-[#123424]"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {t(f.label)}
            {f.value === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 bg-lime-400 text-[#123424] text-[9px] font-black px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>
      <PageTransition page={isInitialLoading ? -1 : `${filter}:${page}`}>
        {isInitialLoading ? (
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
                ? t({
                    ro: "Nicio notificare necitită",
                    en: "No unread notifications",
                  })
                : t({ ro: "Nicio notificare", en: "No notifications" })}
            </p>
            <p className="text-sm text-slate-500">
              {filter === "unread"
                ? t({
                    ro: "Ești la curent cu tot ce se întâmplă.",
                    en: "You're all caught up.",
                  })
                : t({
                    ro: "Notificările vor apărea după prima activitate.",
                    en: "Notifications will appear after your first activity.",
                  })}
            </p>
          </div>
        ) : (
          <div>
            <div
              className={`space-y-2.5 transition-opacity ${
                isPageLoading ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              {notifications.map((n) => (
                <NotificationCard
                  key={n.id}
                  notif={n}
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
      </PageTransition>
    </div>
  );
}
