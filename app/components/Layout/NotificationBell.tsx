"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import useSWR, { mutate as globalMutate } from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { FaRegBell } from "react-icons/fa";
import { ArrowRight, BellOff } from "lucide-react";
import type { Notification } from "@prisma/client";
import { NOTIF_CONFIG } from "@/lib/constants/notifications";
import { useRecashSocket } from "@/hooks/useRecashSocket";
import { useI18n, type Locale } from "@/context/I18nContext";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const RECENT_URL = "/api/v1/profile/notifications?page=1&limit=5";

type ApiResponse = {
  notifications: Notification[];
  unreadCount: number;
};

function timeAgo(dateStr: Date, locale: Locale): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return locale === "ro" ? "acum" : "now";
  if (mins < 60)
    return locale === "ro" ? `acum ${mins} min` : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return locale === "ro" ? `acum ${hours}h` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return locale === "ro" ? `acum ${days}z` : `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(
    locale === "ro" ? "ro-RO" : "en-GB",
    { day: "numeric", month: "short" },
  );
}

function NotifRow({
  notif,
  locale,
  onClick,
}: {
  notif: Notification;
  locale: Locale;
  onClick: () => void;
}) {
  const cfg = NOTIF_CONFIG[notif.type] ?? NOTIF_CONFIG.SYSTEM;
  const Icon = cfg.Icon;

  const inner = (
    <div
      className={`relative flex items-start gap-3 p-3 rounded-2xl border transition-colors cursor-pointer ${
        notif.read
          ? "bg-white border-slate-100 hover:border-slate-200"
          : "bg-lime-50 border-lime-300 hover:border-lime-300"
      }`}
    >
      {!notif.read && (
        <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-lime-400" />
      )}
      <div
        className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center ${cfg.bg} ${cfg.border}`}
      >
        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-[13px] font-semibold leading-snug line-clamp-1 ${
              notif.read ? "text-slate-700" : "text-slate-900"
            }`}
          >
            {notif.title}
          </p>
          <span className="shrink-0 text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
            {timeAgo(notif.createdAt, locale)}
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-0.5 leading-snug line-clamp-2">
          {notif.message}
        </p>
      </div>
    </div>
  );

  return notif.link ? (
    <Link href={notif.link} onClick={onClick} className="block">
      {inner}
    </Link>
  ) : (
    <div onClick={onClick}>{inner}</div>
  );
}

function RowSkeleton() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-3 rounded-2xl border border-slate-100 bg-white animate-pulse"
        >
          <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
          <div className="flex-1 min-w-0 pr-4 space-y-2 pt-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="h-3 w-28 bg-slate-100 rounded" />
              <div className="h-2.5 w-8 bg-slate-100 rounded" />
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded" />
            <div className="h-2.5 w-1/2 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </>
  );
}

export function NotificationBell({
  unreadCount,
  onOpenChange,
}: {
  unreadCount: number;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const { on, off } = useRecashSocket();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Only fetch the recent list once the dropdown is opened; SWR then keeps it
  // cached so subsequent opens are instant.
  const { data, isLoading, mutate } = useSWR<ApiResponse>(
    open ? RECENT_URL : null,
    fetcher,
    { revalidateOnFocus: true, dedupingInterval: 5_000 },
  );

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const handler = () => mutate();
    on("notification:new", handler);
    return () => off("notification:new", handler);
  }, [open, on, off, mutate]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const notifications = data?.notifications ?? [];

  const handleItemClick = useCallback(
    async (notif: Notification) => {
      setOpen(false);
      if (notif.read) return;
      // Optimistically flip to read, then persist and refresh the bell count.
      mutate(
        (current) =>
          current
            ? {
                ...current,
                unreadCount: Math.max(0, current.unreadCount - 1),
                notifications: current.notifications.map((n) =>
                  n.id === notif.id ? { ...n, read: true } : n,
                ),
              }
            : current,
        { revalidate: false },
      );
      await fetch("/api/v1/profile/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [notif.id] }),
      });
      globalMutate(
        (key: unknown) =>
          typeof key === "string" &&
          key.includes("/api/v1/profile/notifications"),
      );
    },
    [mutate],
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid place-items-center w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
        aria-label={t({ ro: "Notificări", en: "Notifications" })}
        aria-expanded={open}
      >
        <FaRegBell className="w-5 h-5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute -right-18 top-full mt-0 pt-2 w-[340px] max-w-[calc(100vw-1rem)] origin-top-right z-[1002]"
          >
            <motion.div
              layout
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-3xl border border-slate-200 shadow shadow-slate-200/60 p-4 flex flex-col gap-2"
            >
              {isLoading && notifications.length === 0 ? (
                <RowSkeleton />
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center text-center px-4 py-10">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <BellOff className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    {t({ ro: "Nicio notificare", en: "No notifications" })}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t({
                      ro: "Aici vor apărea noutățile tale.",
                      en: "Your updates will show up here.",
                    })}
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false} mode="popLayout">
                  {notifications.map((n) => (
                    <motion.div
                      key={n.id}
                      layout
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <NotifRow
                        notif={n}
                        locale={locale}
                        onClick={() => handleItemClick(n)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}

              <motion.div layout>
                <Link
                  href="/notificari"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-1 px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-[#123424] transition-colors"
                >
                  {t({
                    ro: "Vezi toate notificările",
                    en: "See all notifications",
                  })}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
