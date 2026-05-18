"use client";

import { useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import { useRecashSocket } from "./useRecashSocket";
import { NOTIF_CONFIG } from "@/lib/constants/notifications";
import { showToast } from "@/lib/toast";
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
  const { on, off } = useRecashSocket();

  const { data, mutate } = useSWR<BellData>(
    authenticated ? "/api/v1/profile/notifications?page=1&limit=1" : null,
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: process.env.NEXT_PUBLIC_WS_URL ? 60_000 : 15_000,
      dedupingInterval: 3_000,
    },
  );

  const seenRef = useRef<Map<string, number>>(new Map());

  const displayNotification = useCallback((notif: IncomingNotification) => {
    const now = Date.now();
    const seen = seenRef.current;

    for (const [id, expiresAt] of seen) {
      if (now > expiresAt) seen.delete(id);
    }
    if (seen.has(notif.id)) return;
    seen.set(notif.id, now + DEDUP_TTL_MS);

    const cfg =
      NOTIF_CONFIG[notif.type as NotificationType] ?? NOTIF_CONFIG.SYSTEM;

    const variant =
      notif.type === "RATING_RECEIVED"
        ? "rating"
        : notif.type === "POST_CLAIMED" && notif.title.includes("aprobată")
          ? "success"
          : notif.type === "POST_CLAIMED"
            ? "courier"
            : cfg.color.includes("red")
              ? "error"
              : cfg.color.includes("amber") || cfg.color.includes("yellow")
                ? "warning"
                : cfg.color.includes("lime") || cfg.color.includes("green")
                  ? "success"
                  : "info";

    showToast(variant, notif.title, notif.message, notif.link ?? undefined);
  }, []);

  const handleNewNotification = useCallback(
    (payload: IncomingNotification) => {
      displayNotification(payload);
      mutate(undefined, { revalidate: true });
    },
    [displayNotification, mutate],
  );

  useEffect(() => {
    if (!authenticated) return;
    on("notification:new", handleNewNotification);
    return () => off("notification:new", handleNewNotification);
  }, [authenticated, on, off, handleNewNotification]);

  const resetExtra = useCallback(() => {
    mutate((current) => ({ unreadCount: 0, ...current }), { revalidate: true });
  }, [mutate]);

  return {
    unreadCount: data?.unreadCount ?? 0,
    resetExtra,
  };
}
