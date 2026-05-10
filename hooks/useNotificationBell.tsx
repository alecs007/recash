"use client";

import { useEffect, useRef, useCallback } from "react";
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
  unreadCount: number;
}

const DEDUP_TTL_MS = 15_000;

export function useNotificationBell(authenticated: boolean) {
  const router = useRouter();
  const { on, off } = useRecashSocket();

  const { data, mutate } = useSWR<BellData>(
    authenticated ? "/api/v1/profile/notifications?page=1&limit=1" : null,
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 0,
      dedupingInterval: 3_000,
    },
  );

  const seenRef = useRef<Map<string, number>>(new Map());

  const showToast = useCallback(
    (notif: IncomingNotification) => {
      const now = Date.now();
      const seen = seenRef.current;

      for (const [id, expiresAt] of seen) {
        if (now > expiresAt) seen.delete(id);
      }

      if (seen.has(notif.id)) return;
      seen.set(notif.id, now + DEDUP_TTL_MS);

      const cfg =
        NOTIF_CONFIG[notif.type as NotificationType] ?? NOTIF_CONFIG.SYSTEM;
      const Icon = cfg.Icon;
      const hasLink = !!notif.link;

      toast.custom(
        (toastId) => (
          <div
            style={{ width: 356 }}
            onClick={() => {
              if (hasLink) {
                router.push(notif.link!);
                toast.dismiss(toastId);
              }
            }}
            className={`
            flex items-start gap-3 bg-white rounded-2xl border shadow-sm p-4 transition-all
            ${cfg.border} 
            ${hasLink ? "cursor-pointer hover:bg-slate-50 active:scale-[0.98]" : ""}
          `}
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
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.dismiss(toastId);
              }}
              className="shrink-0 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        ),
        { duration: 6000 },
      );
    },
    [router],
  );

  const handleNewNotification = useCallback(
    (payload: IncomingNotification) => {
      showToast(payload);
      mutate(undefined, { revalidate: true });
    },
    [showToast, mutate],
  );

  useEffect(() => {
    if (!authenticated) return;
    on("notification:new", handleNewNotification);
    return () => off("notification:new", handleNewNotification);
  }, [authenticated, on, off, handleNewNotification]);

  const resetExtra = useCallback(() => {
    mutate(undefined, { revalidate: true });
  }, [mutate]);

  return {
    unreadCount: data?.unreadCount ?? 0,
    resetExtra,
  };
}
