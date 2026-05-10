"use client";

/**
 * hooks/useNotificationBell.ts  (v2)
 *
 * Bugs fixed vs v1:
 *  1. Deduplication used a single ref (only tracked ONE id) so rapid bursts
 *     of distinct notifications only showed the first toast. Now uses a Set
 *     that expires entries after 10 s so replay-safe but not overly strict.
 *  2. toast.custom(..., { id }) made Sonner replace any existing toast with
 *     that id, silently swallowing toasts that arrived while another was open.
 *     Fixed: do NOT pass `id` to toast.custom — let Sonner assign its own id
 *     so every notification stacks independently. Deduplication is done
 *     explicitly via the seenIds Set before calling toast at all.
 *  3. Removed the "latestToastRef" single-notification gate entirely.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import useSWR from "swr";
import { useRecashSocket } from "./useRecashSocket";
import { NOTIF_CONFIG } from "@/lib/constants/notifications";
import type { NotificationType } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface IncomingNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
}

interface BellData {
  notifications: IncomingNotification[];
  unreadCount: number;
}

/** Time after which we'll allow the same notification id to re-trigger a toast
 *  (guards against duplicate WS messages on reconnect). */
const DEDUP_TTL_MS = 10_000;

export function useNotificationBell(authenticated: boolean) {
  const router = useRouter();
  const { on, off } = useRecashSocket();

  // One fetch on mount for the initial count; revalidateOnFocus keeps it fresh.
  // No refreshInterval — WS delivers updates in real-time.
  const { data, mutate } = useSWR<BellData>(
    authenticated ? "/api/v1/profile/notifications?page=1&limit=1" : null,
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 0, dedupingInterval: 5_000 },
  );

  // Extra count for notifications that arrived via WS since last full revalidation
  const [extraUnread, setExtraUnread] = useState(0);

  // Set of notification ids we've already shown a toast for, with expiry timestamps
  const seenRef = useRef<Map<string, number>>(new Map());

  const showToast = useCallback(
    (notif: IncomingNotification) => {
      const now = Date.now();
      const seen = seenRef.current;

      // Evict expired entries
      for (const [id, ts] of seen) {
        if (now - ts > DEDUP_TTL_MS) seen.delete(id);
      }

      // Skip if we already toasted this exact notification recently
      if (seen.has(notif.id)) return;
      seen.set(notif.id, now);

      const cfg =
        NOTIF_CONFIG[notif.type as NotificationType] ?? NOTIF_CONFIG.SYSTEM;
      const Icon = cfg.Icon;

      // Do NOT pass `id` to toast.custom — each notification gets a unique
      // Sonner-assigned id so they stack rather than replace each other.
      toast.custom(
        (toastId) => (
          <div
            style={{ width: 356 }}
            className={`flex items-start gap-3 bg-white rounded-2xl border shadow-lg ${cfg.border} p-4`}
          >
            <div
              className={`shrink-0 w-9 h-9 rounded-full ${cfg.bg} border ${cfg.border} flex items-center justify-center`}
            >
              <Icon className={`w-4 h-4 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 leading-snug">
                {notif.title}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                {notif.message}
              </p>
              {notif.link && (
                <button
                  onClick={() => {
                    router.push(notif.link!);
                    toast.dismiss(toastId);
                  }}
                  className="mt-1.5 text-xs font-semibold text-[#123424] hover:underline"
                >
                  Deschide →
                </button>
              )}
            </div>
            <button
              onClick={() => toast.dismiss(toastId)}
              className="shrink-0 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        ),
        { duration: 6000 },
        // ↑ No `id` field — Sonner assigns unique ids → toasts stack properly
      );
    },
    [router],
  );

  const handleNewNotification = useCallback(
    (payload: IncomingNotification) => {
      setExtraUnread((n) => n + 1);
      showToast(payload);
      // Background revalidate so the bell count stays in sync with the server
      mutate(undefined, { revalidate: true });
    },
    [showToast, mutate],
  );

  useEffect(() => {
    if (!authenticated) return;
    on("notification:new", handleNewNotification);
    return () => off("notification:new", handleNewNotification);
  }, [authenticated, on, off, handleNewNotification]);

  // Called by the notifications page on mount to sync the count
  const resetExtra = useCallback(() => {
    setExtraUnread(0);
    mutate(undefined, { revalidate: true });
  }, [mutate]);

  const unreadCount = (data?.unreadCount ?? 0) + extraUnread;

  return { unreadCount, resetExtra };
}
