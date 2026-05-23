import { ChevronLeft, ChevronRight } from "lucide-react";
import { scrollToTop } from "@/app/components/UX/SmoothScroll";

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const handlePageChange = (newPage: number) => {
    onPageChange(newPage);
    setTimeout(() => scrollToTop(true), 150);
  };

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button
        onClick={() => {
          handlePageChange(Math.max(1, page - 1));
        }}
        disabled={page === 1}
        className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm text-slate-500 font-medium">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => {
          handlePageChange(Math.min(totalPages, page + 1));
        }}
        disabled={page === totalPages}
        className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
