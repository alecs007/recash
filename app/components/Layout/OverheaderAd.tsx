"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/context/I18nContext";

export interface OverheaderAdConfig {
  id: string;
  imageSrc: string;
  imageAlt: string;
  href: string;
  label?: string;
}

const DISMISS_PREFIX = "overheader-ad-dismissed:";

type PhraseSegment = { text: string; className: string };

const IE_PHRASES: Record<"ro" | "en", PhraseSegment[][]> = {
  ro: [
    [
      { text: "un proiect pentru ", className: "text-slate-500" },
      { text: "InfoEducație 2026", className: "text-lime-700 font-bold" },
    ],
    [
      { text: "git commit -m ", className: "text-slate-500" },
      { text: '"reciclarea, refactorizată"', className: "text-amber-600" },
    ],
    [
      { text: "while (sticle) ", className: "text-slate-500" },
      { text: "{ recash(); }", className: "text-lime-700" },
    ],
    [
      { text: "sticle.map(", className: "text-slate-500" },
      { text: "s => easy cash", className: "text-sky-600" },
      { text: ")", className: "text-slate-500" },
    ],
  ],
  en: [
    [
      { text: "a project for ", className: "text-slate-500" },
      { text: "InfoEducație 2026", className: "text-lime-700 font-bold" },
    ],
    [
      { text: "git commit -m ", className: "text-slate-500" },
      { text: '"recycling, refactored"', className: "text-amber-600" },
    ],
    [
      { text: "while (bottles) ", className: "text-slate-500" },
      { text: "{ recash(); }", className: "text-lime-700" },
    ],
    [
      { text: "bottles.map(", className: "text-slate-500" },
      { text: "b => cash", className: "text-sky-600" },
      { text: ")", className: "text-slate-500" },
    ],
  ],
};

const TYPE_MS = 46;
const DELETE_MS = 17;
const HOLD_MS = 2600;

function InfoEducatieBanner() {
  const { locale } = useI18n();
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [chars, setChars] = useState(0);

  const phrases = IE_PHRASES[locale === "en" ? "en" : "ro"];
  const phrase = phrases[phraseIdx % phrases.length];
  const fullLength = phrase.reduce((n, s) => n + s.text.length, 0);

  useEffect(() => {
    let visible = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (!deleting) {
        visible++;
        setChars(visible);
        if (visible >= fullLength) {
          deleting = true;
          timer = setTimeout(tick, HOLD_MS);
        } else {
          timer = setTimeout(tick, TYPE_MS + Math.random() * 50);
        }
      } else {
        visible--;
        setChars(visible);
        if (visible <= 0) {
          setPhraseIdx((p) => p + 1);
        } else {
          timer = setTimeout(tick, DELETE_MS);
        }
      }
    };

    timer = setTimeout(tick, 400);
    return () => clearTimeout(timer);
  }, [phraseIdx, fullLength]);

  const segmentStarts = phrase.map((_, i) =>
    phrase.slice(0, i).reduce((n, s) => n + s.text.length, 0),
  );
  const typed = phrase.map((seg, i) => (
    <span key={i} className={seg.className}>
      {seg.text.slice(0, Math.max(0, chars - segmentStarts[i]))}
    </span>
  ));

  return (
    <a
      href="https://infoeducatie.ro"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="InfoEducație"
      className="flex-1 min-w-0 h-full flex items-center justify-center group"
    >
      <style>{`
        @keyframes ie-blink {
          0%, 55% { opacity: 1; }
          56%, 100% { opacity: 0; }
        }
      `}</style>

      <span className="w-[270px] sm:w-[320px] flex items-center font-mono text-[11px] leading-none whitespace-nowrap overflow-hidden">
        <span className="text-lime-600 font-bold mr-1.5 select-none">❯</span>
        <span className="whitespace-pre">{typed}</span>
        <span
          aria-hidden
          className="inline-block w-[6px] h-3 ml-0.5 bg-lime-500 rounded-[1px]"
          style={{ animation: "ie-blink 1.1s steps(1) infinite" }}
        />
      </span>
    </a>
  );
}

export function OverheaderAd({
  ad,
  headerRef,
}: {
  ad?: OverheaderAdConfig;
  headerRef: React.RefObject<HTMLElement | null>;
}) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [closed, setClosed] = useState(false);
  const adRef = useRef<HTMLDivElement>(null);
  const progress = useRef(0);

  const dismissKey = `${DISMISS_PREFIX}${ad?.id ?? "default"}`;

  useEffect(() => {
    setMounted(true);
    try {
      const val = sessionStorage.getItem(dismissKey);
      setClosed(!!val);
    } catch {
      setClosed(false);
    }
  }, [dismissKey]);

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
  }, [closed, headerRef, mounted]);

  const handleClose = useCallback(() => {
    setClosed(true);
    try {
      sessionStorage.setItem(dismissKey, "1");
    } catch {}
  }, [dismissKey]);

  if (closed) return null;

  return (
    <div
      ref={adRef}
      className={`bg-gradient-to-r from-lime-50 via-white to-emerald-50 border-b border-lime-100 ${!mounted ? "invisible" : ""}`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center gap-2 h-9 sm:h-10">
        <button
          onClick={handleClose}
          aria-label={t({ ro: "Închide reclama", en: "Close ad" })}
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
          <InfoEducatieBanner />
        )}
      </div>
    </div>
  );
}
