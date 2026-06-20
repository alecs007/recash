import Image from "next/image";
import Link from "next/link";

export interface SponsorAd {
  /** Unique key for React list rendering */
  id: string;
  /** Image shown in the ad slot */
  imageSrc: string;
  imageAlt: string;
  /** Where clicking the ad goes */
  href: string;
  /** Optional label shown below the image (sponsor name / tagline) */
  label?: string;
}

interface SectionDividerProps {
  /** Pass an ad to show a sponsor slot; omit for an empty / placeholder slot */
  ad?: SponsorAd;
  /** Index used to give each divider a unique aria-label */
  variant?: number;
}

/**
 * SectionDivider – homepage section break that doubles as a sponsor ad slot.
 *
 * Usage (with a live ad):
 *   <SectionDivider
 *     ad={{
 *       id: "returo-2024",
 *       imageSrc: "/ads/returo-banner.jpg",
 *       imageAlt: "RetuRO – Reciclează cu noi",
 *       href: "https://returo.ro",
 *       label: "Partener oficial Recash",
 *     }}
 *   />
 *
 * Usage (empty placeholder – shows "Ad" label so it's obvious where to plug in):
 *   <SectionDivider />
 */
export const SectionDivider = ({ ad, variant = 0 }: SectionDividerProps) => {
  return (
    <div
      className="my-12 lg:my-20"
      aria-label={`Reclamă sponsor ${variant + 1}`}
      role="complementary"
    >
      {ad ? (
        /* ── Live sponsor ad ───────────────────────────────────────────── */
        <Link
          href={ad.href}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="group block w-full rounded-2xl overflow-hidden border border-slate-100 hover:border-lime-300 transition-colors shadow-sm hover:shadow-md"
          aria-label={`Sponsor: ${ad.imageAlt}`}
        >
          <div className="relative w-full" style={{ aspectRatio: "6 / 1" }}>
            <Image
              src={ad.imageSrc}
              alt={ad.imageAlt}
              fill
              sizes="(max-width: 768px) 100vw, 1280px"
              className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.015]"
              priority={false}
            />
          </div>

          {ad.label && (
            <div className="bg-white border-t border-slate-100 px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {ad.label}
              </span>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-300 border border-slate-100 rounded px-1.5 py-0.5">
                Sponsor
              </span>
            </div>
          )}
        </Link>
      ) : (
        /* ── Empty placeholder (visible to admins / dev) ──────────────── */
        <div className="w-full aspect-[6/1] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 py-8 px-6 text-center select-none">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            {/* simple image-placeholder icon */}
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="8.5" cy="10.5" r="1.5" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 15l-5-5L5 19"
              />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-500">
            Spațiu publicitar disponibil
          </p>
        </div>
      )}
    </div>
  );
};
