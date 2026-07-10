"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoLanguageSharp } from "react-icons/io5";
import { useI18n, type Locale, type Currency } from "@/context/I18nContext";

function RoFlag({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 30 30"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect x="0" y="0" width="10" height="30" fill="#002B7F" />
      <rect x="10" y="0" width="10" height="30" fill="#FCD116" />
      <rect x="20" y="0" width="10" height="30" fill="#CE1126" />
    </svg>
  );
}

function GbFlag({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 30"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="3" />
      <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

function RoundOption({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`relative w-7 h-5 rounded overflow-hidden shrink-0 transition-all duration-200 cursor-pointer ${
        active
          ? "ring ring-lime-400 ring-offset-1"
          : "opacity-45 grayscale-[35%] hover:opacity-80 hover:grayscale-0"
      }`}
    >
      {children}
    </button>
  );
}

export function PreferenceSwitcherInline() {
  const { locale, currency, setLocale, setCurrency, t } = useI18n();

  const langOptions: { value: Locale; label: string; flag: React.ReactNode }[] =
    [
      { value: "ro", label: "Română", flag: <RoFlag /> },
      { value: "en", label: "English", flag: <GbFlag /> },
    ];

  const currencyOptions: { value: Currency; label: string; symbol: string }[] =
    [
      { value: "RON", label: "RON (lei)", symbol: "lei" },
      { value: "EUR", label: "EUR (€)", symbol: "€" },
    ];

  return (
    <div
      className="flex items-center justify-around px-4 py-2.5"
      aria-label={t({ ro: "Limbă și monedă", en: "Language and currency" })}
    >
      <div className="flex items-center gap-2">
        {langOptions.map((o) => (
          <RoundOption
            key={o.value}
            active={locale === o.value}
            onClick={() => setLocale(o.value)}
            label={o.label}
          >
            {o.flag}
          </RoundOption>
        ))}
      </div>

      <div className="w-px h-6 bg-slate-100" />

      <div className="flex items-center gap-2">
        {currencyOptions.map((o) => (
          <RoundOption
            key={o.value}
            active={currency === o.value}
            onClick={() => setCurrency(o.value)}
            label={o.label}
          >
            <span
              className={`w-full h-full flex items-center justify-center font-black transition-colors ${
                currency === o.value
                  ? "bg-[#123424] text-lime-400"
                  : "bg-slate-100 text-slate-500"
              } ${o.symbol === "€" ? "text-sm" : "text-[10px]"}`}
            >
              {o.symbol}
            </span>
          </RoundOption>
        ))}
      </div>
    </div>
  );
}

export function LocaleSwitcher() {
  const { locale, currency, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => {
        if (window.matchMedia("(pointer: fine)").matches) setOpen(true);
      }}
      onMouseLeave={() => {
        if (window.matchMedia("(pointer: fine)").matches) setOpen(false);
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t({
          ro: "Limbă și monedă",
          en: "Language and currency",
        })}
        className="flex items-center gap-1.5 h-10 px-2.5 rounded-full bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <IoLanguageSharp className="w-5 h-5 text-lime-600" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute -right-23 top-full mt-0 pt-2 w-56 origin-top-right z-[1002]"
          >
            <div className="bg-white rounded-3xl border border-slate-200 py-1">
              <PreferenceSwitcherInline />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
