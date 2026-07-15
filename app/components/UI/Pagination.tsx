"use client";

import { useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { scrollToTop } from "@/app/components/UX/SmoothScroll";
import { useI18n } from "@/context/I18nContext";

type PageItem = number | "gap";

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

function pageItems(page: number, total: number, maxSlots: number): PageItem[] {
  if (total <= maxSlots) return range(1, total);
  const edge = maxSlots - 2;
  const siblings = Math.floor((maxSlots - 5) / 2);
  if (page < edge) return [...range(1, edge), "gap", total];
  if (page > total - edge + 1)
    return [1, "gap", ...range(total - edge + 1, total)];
  return [1, "gap", ...range(page - siblings, page + siblings), "gap", total];
}

const DESKTOP_MQ = "(min-width: 640px)";
const subscribeToMq = (cb: () => void) => {
  const mq = window.matchMedia(DESKTOP_MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useIsDesktop = () =>
  useSyncExternalStore(
    subscribeToMq,
    () => window.matchMedia(DESKTOP_MQ).matches,
    () => false,
  );

const btnSize = "h-9 min-w-9 px-1 flex items-center justify-center";

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const { t } = useI18n();
  const isDesktop = useIsDesktop();

  const go = (p: number) => {
    if (p === page || p < 1 || p > totalPages) return;
    scrollToTop();

    if (window.scrollY < 80) {
      onPageChange(p);
    } else {
      setTimeout(() => onPageChange(p), 500);
    }
  };

  const items = pageItems(page, totalPages, isDesktop ? 7 : 5);

  return (
    <nav
      aria-label={t({ ro: "Paginare", en: "Pagination" })}
      className="flex items-center justify-center gap-1.5 pt-4"
    >
      <button
        onClick={() => go(page - 1)}
        disabled={page === 1}
        aria-label={t({ ro: "Pagina anterioară", en: "Previous page" })}
        className={`${btnSize} rounded-xl text-slate-600 border border-slate-200 bg-white hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer`}
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
      </button>

      {items.map((item, i) =>
        item === "gap" ? (
          <span
            key={`gap-${i}`}
            aria-hidden="true"
            className="w-5 h-9 flex items-center justify-center text-sm text-slate-400 select-none"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => go(item)}
            aria-current={item === page ? "page" : undefined}
            aria-label={t({
              ro: `Pagina ${item}`,
              en: `Page ${item}`,
            })}
            className={`${btnSize} rounded-xl text-sm font-semibold border transition-all cursor-pointer tabular-nums ${
              item === page
                ? "bg-[#123424] text-white border-[#123424]"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {item}
          </button>
        ),
      )}

      <button
        onClick={() => go(page + 1)}
        disabled={page === totalPages}
        aria-label={t({ ro: "Pagina următoare", en: "Next page" })}
        className={`${btnSize} rounded-xl text-slate-600 border border-slate-200 bg-white hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer`}
      >
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
