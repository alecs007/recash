"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export interface OverheaderAdConfig {
  id: string;
  imageSrc: string;
  imageAlt: string;
  href: string;
  label?: string;
}

const DISMISS_PREFIX = "overheader-ad-dismissed:";
const REVEAL_FLOOR = 48;

export function OverheaderAd({ ad }: { ad?: OverheaderAdConfig }) {
  const [mounted, setMounted] = useState(false);
  const [closed, setClosed] = useState(false);
  const [hiddenByScroll, setHiddenByScroll] = useState(false);

  const dismissKey = `${DISMISS_PREFIX}${ad?.id ?? "default"}`;

  useEffect(() => {
    setMounted(true);
    try {
      setClosed(!!sessionStorage.getItem(dismissKey));
    } catch {
      setClosed(false);
    }
  }, [dismissKey]);

  useEffect(() => {
    if (closed) return;

    let touchStartY = 0;
    let lastScrollY = window.scrollY;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const diff = touchStartY - e.changedTouches[0].clientY;
      if (diff === 0) return;
      setHiddenByScroll(diff > 0);
    };

    const onWheel = (e: WheelEvent) => {
      setHiddenByScroll(e.deltaY > 0);
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("wheel", onWheel);
    };
  }, [closed]);

  const handleClose = useCallback(() => {
    setClosed(true);
    try {
      sessionStorage.setItem(dismissKey, "1");
    } catch {
      /* non-fatal */
    }
  }, [dismissKey]);

  if (!mounted) return null;

  const visible = !closed && !hiddenByScroll;

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="overheader-ad"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={{ willChange: "height" }}
          className="overflow-hidden bg-slate-50 border-b border-slate-100"
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center gap-2 h-9 sm:h-10">
            <button
              onClick={handleClose}
              aria-label="Închide reclama"
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
              <div className="flex-1 min-w-0 flex items-center justify-center gap-2">
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-300 border border-slate-200 rounded px-1.5 py-0.5">
                  Ad
                </span>
                <span className="text-xs text-slate-400 truncate">
                  Spațiu publicitar disponibil
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
