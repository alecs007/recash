"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import { X } from "lucide-react";
import { FaWineBottle } from "react-icons/fa6";
import { useI18n } from "@/context/I18nContext";

export interface OverheaderAdConfig {
  id: string;
  imageSrc: string;
  imageAlt: string;
  href: string;
  label?: string;
}

const DISMISS_PREFIX = "overheader-ad-dismissed:";

const subscribeNever = () => () => {};

/**
 * `false` on the server and for the hydrating render, `true` from the first
 * client render onward. Lets us defer browser-only reads (sessionStorage) to the
 * client without setting state from an effect.
 */
function useHydrated() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

function readDismissed(key: string) {
  try {
    return sessionStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

export function OverheaderAd({
  ad,
  headerRef,
}: {
  ad?: OverheaderAdConfig;
  headerRef: React.RefObject<HTMLElement | null>;
}) {
  const { t } = useI18n();
  const hydrated = useHydrated();
  const [dismissedNow, setDismissedNow] = useState(false);
  const adRef = useRef<HTMLDivElement>(null);

  const dismissKey = `${DISMISS_PREFIX}${ad?.id ?? "default"}`;

  // Derived rather than stored: the stored flag is only readable once hydrated,
  // and `dismissedNow` covers a dismissal in this render pass.
  const closed = dismissedNow || (hydrated && readDismissed(dismissKey));

  useEffect(() => {
    if (closed || !adRef.current || !headerRef.current) return;

    const adEl = adRef.current;
    const headerEl = headerRef.current;
    const adHeight = adEl.offsetHeight;

    let lastY = window.scrollY;
    let touchY = 0;
    let target = 0;
    let current = 0;
    let rafId: number;

    const spring = () => {
      current += (target - current) * 0.12;
      if (Math.abs(target - current) < 0.1) current = target;
      headerEl.style.transform = `translateY(${-current}px)`;
      rafId = requestAnimationFrame(spring);
    };
    rafId = requestAnimationFrame(spring);

    const update = (delta: number) => {
      const y = window.scrollY;
      if (y <= 0) {
        target = 0;
        return;
      }
      const raw = target / adHeight + delta / adHeight;
      target = Math.min(1, Math.max(0, raw)) * adHeight;
    };

    const onScroll = () => {
      const y = window.scrollY;
      update(y - lastY);
      lastY = y;
    };

    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      const delta = touchY - e.touches[0].clientY;
      touchY = e.touches[0].clientY;
      update(delta);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      headerEl.style.transform = "";
    };
  }, [closed, headerRef, hydrated]);

  const handleClose = useCallback(() => {
    setDismissedNow(true);
    try {
      sessionStorage.setItem(dismissKey, "1");
    } catch {}
  }, [dismissKey]);

  if (closed) return null;

  return (
    <div
      ref={adRef}
      className={`bg-slate-50 border-b border-slate-100 ${!hydrated ? "invisible" : ""}`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center gap-2 h-9 sm:h-10">
        <button
          onClick={handleClose}
          aria-label={
            ad
              ? t({ ro: "Închide reclama", en: "Close ad" })
              : t({ ro: "Închide mesajul", en: "Close message" })
          }
          className="shrink-0 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-3 h-3 text-slate-500" />
        </button>

        {ad ? (
          <Link
            href={ad.href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            aria-label={ad.label ?? ad.imageAlt}
            className="flex-1 min-w-0 h-full flex items-center justify-center gap-2 group"
          >
            <span className="relative w-[110px] h-6 sm:w-[150px] sm:h-7 shrink-0">
              <Image
                src={ad.imageSrc}
                alt={ad.imageAlt}
                fill
                sizes="150px"
                draggable={false}
                className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </span>
            {ad.label && (
              <span className="hidden sm:inline text-xs font-semibold text-slate-500 truncate">
                {ad.label}
              </span>
            )}
          </Link>
        ) : (
          <div className="flex-1 min-w-0 flex items-center justify-center gap-2.5 sm:gap-3">
            <span className="text-xs font-semibold text-slate-600 truncate">
              <FaWineBottle className="inline-block w-3.5 h-3.5 mr-1.5 -translate-y-px text-lime-600" />
              {t({ ro: "Sticle goale =", en: "Empty bottles =" })}{" "}
              <span className="font-bold text-lime-600">
                {t({ ro: "bani gheață", en: "instant cash" })}
              </span>
            </span>

            <span
              aria-hidden
              className="hidden lg:block w-px h-4 bg-slate-200"
            />

            <span className="hidden lg:inline text-xs font-medium text-slate-400 truncate">
              {t({
                ro: "Locul lor este în automat, nu la tine în casă.",
                en: "They belong in the machine, not in your home.",
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
