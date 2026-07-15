"use client";

import { useEffect } from "react";
import useSWR, { preload, type SWRConfiguration } from "swr";

export const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Paginated = { totalPages?: number };

export function usePaginatedList<T extends Paginated>(
  buildUrl: (page: number) => string,
  page: number,
  config?: SWRConfiguration<T>,
) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    buildUrl(page),
    fetcher,
    {
      keepPreviousData: true,
      ...config,
    },
  );

  const totalPages = data?.totalPages ?? 1;

  useEffect(() => {
    if (!data) return;
    if (page < totalPages) preload(buildUrl(page + 1), fetcher);
    if (page > 1) preload(buildUrl(page - 1), fetcher);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, totalPages, buildUrl, data === undefined]);

  return {
    data,
    error,
    mutate,
    isValidating,
    totalPages,
    /** No data at all yet — show the skeleton. */
    isInitialLoading: isLoading && data === undefined,
    /** Navigating to an uncached page — previous data is shown, dim it. */
    isPageLoading: isLoading && data !== undefined,
  };
}
