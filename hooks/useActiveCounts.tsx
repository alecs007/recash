"use client";

/**
 * hooks/useActiveCounts.ts
 *
 * Tracks whether the current user has an active post or active collection.
 * Used by the Header to show the animated bottle/bike indicators.
 *
 * v1 problem: Only SWR with 60 s refreshInterval — the indicator could lag
 * a full minute after a claim or completion.
 *
 * v2 fix: Subscribe to WS events that affect active counts and immediately
 * revalidate. 60 s poll kept only as a background safety net.
 *
 * Events that change active counts:
 *   post:status_changed  — claim, approve, cancel, complete
 *   post:completed
 *   post:cancelled
 */

import { useEffect, useCallback } from "react";
import useSWR from "swr";
import { useRecashSocket } from "./useRecashSocket";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ActiveCounts {
  activePosts: number;
  activeCollections: number;
  activePostId: string | null;
  activeCollectionId: string | null;
}

const EMPTY: ActiveCounts = {
  activePosts: 0,
  activeCollections: 0,
  activePostId: null,
  activeCollectionId: null,
};

export function useActiveCounts(authenticated: boolean): ActiveCounts {
  const { on, off } = useRecashSocket();

  const { data, mutate } = useSWR<ActiveCounts>(
    authenticated ? "/api/v1/profile/active-counts" : null,
    fetcher,
    {
      // 60 s poll as safety net; WS triggers instant revalidation
      refreshInterval: 60_000,
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
    },
  );

  const refresh = useCallback(() => {
    mutate(undefined, { revalidate: true });
  }, [mutate]);

  useEffect(() => {
    if (!authenticated) return;
    // These events all change whether the user has an active post/collection
    on("post:status_changed", refresh);
    on("post:completed", refresh);
    on("post:cancelled", refresh);
    return () => {
      off("post:status_changed", refresh);
      off("post:completed", refresh);
      off("post:cancelled", refresh);
    };
  }, [authenticated, on, off, refresh]);

  return data ?? EMPTY;
}
