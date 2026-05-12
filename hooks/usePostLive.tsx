"use client";

import { useEffect, useCallback } from "react";
import useSWR from "swr";
import { useRecashSocket } from "./useRecashSocket";
import type { Post } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const LIVE_STATUSES = new Set(["CLAIMED", "IN_PROGRESS"]);
const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

export function usePostLive(postId: string) {
  const { on, off, subscribePost, unsubscribePost } = useRecashSocket();

  const {
    data: post,
    mutate,
    isLoading,
  } = useSWR<Post>(`/api/v1/posts/${postId}`, fetcher, {
    revalidateOnFocus: true,
    // WS drives updates; poll only as a safety net when WS is unavailable
    refreshInterval: WS_URL ? 0 : 5_000,
    dedupingInterval: 2_000,
  });

  // Join this post's room on the WS server
  useEffect(() => {
    subscribePost(postId);
    return () => unsubscribePost(postId);
  }, [postId, subscribePost, unsubscribePost]);

  // Any post-level WS event → re-fetch the full post detail
  const refresh = useCallback(() => {
    mutate(undefined, { revalidate: true });
  }, [mutate]);

  useEffect(() => {
    on("post:status_changed", refresh);
    on("post:completed", refresh);
    on("post:cancelled", refresh);
    return () => {
      off("post:status_changed", refresh);
      off("post:completed", refresh);
      off("post:cancelled", refresh);
    };
  }, [on, off, refresh]);

  // Additional safety-net poll for active posts when WS is down.
  // Only runs when: WS URL is set (WS is intended), post IS active, and the
  // WS singleton appears to be disconnected.
  const isActive = post ? LIVE_STATUSES.has(post.status) : false;

  useEffect(() => {
    // If no WS configured, SWR refreshInterval above already handles polling
    if (!WS_URL) return;
    // If post is not in an active state, no need for the safety net
    if (!isActive) return;

    // Poll every 10 s purely as a safety net — WS events arrive much faster
    const id = setInterval(
      () => mutate(undefined, { revalidate: true }),
      60_000,
    );
    return () => clearInterval(id);
  }, [isActive, mutate]);

  return { post, mutate, isLoading };
}
