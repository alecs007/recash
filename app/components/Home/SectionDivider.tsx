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
 * Usage (with a live Lidl ad):
 * <SectionDivider
 * ad={{
 * id: "lidl-2024",
 * imageSrc: "https://dummyimage.com/1200x200/0050AA/ffffff.png&text=Lidl+Romania",
 * imageAlt: "Lidl – Meriți să fii surprins",
 * href: "https://www.lidl.ro",
 * label: "Partener oficial: Lidl România",
 * }}
 * />
 *
 * Usage (with a live Kaufland ad):
 * <SectionDivider
 * ad={{
 * id: "kaufland-2024",
 * imageSrc: "https://dummyimage.com/1200x200/E3000F/ffffff.png&text=Kaufland+Romania",
 * imageAlt: "Kaufland – Lucrurile bune vin ușor",
 * href: "https://www.kaufland.ro",
 * label: "Partener oficial: Kaufland România",
 * }}
 * />
 *
 * Usage (empty placeholder – shows "Ad" label so it's obvious where to plug in):
 * <SectionDivider />
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
          className="group block w-full rounded-2xl overflow-hidden border border-slate-100 hover:border-lime-300 transition-colors"
          aria-label={`Sponsor: ${ad.imageAlt}`}
        >
          <div className="relative w-full aspect-[6/2] lg:aspect-[6/1]">
            <Image
              src={ad.imageSrc}
              alt={ad.imageAlt}
              fill
              sizes="(max-width: 768px) 100vw, 1280px"
              className="object-cover object-center"
              priority={false}
            />
          </div>

          {/* {ad.label && (
            <div className="bg-white border-t border-slate-100 px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {ad.label}
              </span>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-300 border border-slate-100 rounded px-1.5 py-0.5">
                Sponsor
              </span>
            </div>
          )} */}
        </Link>
      ) : (
        <div className="relative w-full aspect-[6/2] lg:aspect-[6/1] rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
          <Image
            src="/images/ad-placeholder.avif"
            alt="Spațiu publicitar disponibil"
            fill
            className="h-full object-contain opacity-30 grayscale contrast-100 py-4 lg:py-6"
          />
        </div>
      )}
    </div>
  );
};
