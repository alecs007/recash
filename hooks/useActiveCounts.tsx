"use client";

import { useEffect, useCallback } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { useRecashSocket } from "./useRecashSocket";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const API_KEY = "/api/v1/profile/active-counts";

export interface PendingRequestSummary {
  postId: string;
  locationName: string | null;
  bottleCount: number;
}

export interface ActiveCounts {
  activePosts: number;
  activeCollections: number;
  activePostId: string | null;
  activeCollectionId: string | null;
  // Non-binding pending collect requests (separate from a bound collection).
  pendingRequests: number;
  pendingRequestPostId: string | null;
  pendingRequestsList: PendingRequestSummary[];
}

const EMPTY: ActiveCounts = {
  activePosts: 0,
  activeCollections: 0,
  activePostId: null,
  activeCollectionId: null,
  pendingRequests: 0,
  pendingRequestPostId: null,
  pendingRequestsList: [],
};

export function useActiveCounts(authenticated: boolean): ActiveCounts {
  const { on, off } = useRecashSocket();

  const { data, mutate } = useSWR<ActiveCounts>(
    authenticated ? API_KEY : null,
    fetcher,
    {
      refreshInterval: 30_000,
      revalidateOnFocus: true,
      dedupingInterval: 2_000,
    },
  );

  const refresh = useCallback(() => {
    mutate(undefined, { revalidate: true });
  }, [mutate]);

  useEffect(() => {
    if (!authenticated) return;
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

type ActiveCountsUpdate =
  Partial<ActiveCounts> | ((current: ActiveCounts) => Partial<ActiveCounts>);

/** Optimistically patch the header counts, then revalidate. */
export function useSetActiveCounts(): (update: ActiveCountsUpdate) => void {
  return useCallback((update: ActiveCountsUpdate): void => {
    void globalMutate<ActiveCounts>(
      API_KEY,
      (current): ActiveCounts => {
        const base = current ?? EMPTY;
        const partial = typeof update === "function" ? update(base) : update;
        return { ...base, ...partial };
      },
      { revalidate: true },
    );
  }, []);
}
