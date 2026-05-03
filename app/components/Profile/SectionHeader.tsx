import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SectionHeader({
  title,
  href,
  hrefLabel,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
        {title}
      </h2>
      {href && hrefLabel && (
        <Link
          href={href}
          className="flex items-center gap-1 text-sm font-semibold text-lime-700 hover:text-lime-800 transition-colors"
        >
          {hrefLabel}
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
