"use client";

import { useEffect } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { FaCircleInfo } from "react-icons/fa6";
import { motion, AnimatePresence } from "framer-motion";
import { BADGE_CONFIG, BADGE_COLORS } from "@/lib/constants/badges";
import type { BadgeData } from "./BadgeCard";
import { useI18n } from "@/context/I18nContext";

interface BadgeModalProps {
  badge: BadgeData | null;
  earned?: boolean;
  onClose: () => void;
}

export function BadgeModal({ badge, earned = true, onClose }: BadgeModalProps) {
  const { t, locale } = useI18n();
  const isOpen = badge !== null;

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const cfg = badge ? BADGE_CONFIG[badge.type] : null;
  const color =
    earned && badge ? (BADGE_COLORS[badge.type] ?? "#64748B") : "#CBD5E1";

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && badge && cfg && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[10001] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                aria-label={t({ ro: "Închide", en: "Close" })}
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>

              <div
                className="px-6 pt-10 pb-8 flex flex-col items-center gap-4 relative overflow-hidden"
                style={{
                  background: earned
                    ? `linear-gradient(135deg, color-mix(in srgb, ${color} 12%, white), color-mix(in srgb, ${color} 5%, white))`
                    : "linear-gradient(135deg, #f8fafc, #f1f5f9)",
                }}
              >
                <div
                  className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-40 pointer-events-none"
                  style={{ background: earned ? color : "#e2e8f0" }}
                />
                <div
                  className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full blur-3xl opacity-30 pointer-events-none"
                  style={{ background: earned ? color : "#e2e8f0" }}
                />

                {earned && !badge.seen && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
                    className="absolute top-4 left-4 bg-lime-400 text-[#123424] text-[10px] font-black px-2.5 py-1 rounded-full leading-none shadow-sm tracking-wide"
                  >
                    {t({ ro: "NOU", en: "NEW" })}
                  </motion.span>
                )}

                <motion.div
                  initial={{ scale: 0.5, rotate: -15, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{
                    delay: 0.05,
                    type: "spring",
                    stiffness: 320,
                    damping: 22,
                  }}
                  className="relative flex items-center justify-center"
                  style={{ width: 112, height: 120 }}
                >
                  <Image
                    width={256}
                    height={256}
                    priority
                    draggable={false}
                    src={cfg.image}
                    alt={t(cfg.label)}
                    className="w-28 h-28 object-contain"
                    style={{ filter: earned ? "none" : "grayscale(1)" }}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-center"
                >
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    {t(cfg.label)}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">{t(cfg.desc)}</p>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="relative z-10 mx-6 -mt-4 flex items-center gap-3 rounded-2xl border bg-white p-3.5 shadow-sm"
                style={{
                  borderColor: earned
                    ? `color-mix(in srgb, ${color} 30%, white)`
                    : "#e2e8f0",
                }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: earned
                      ? `color-mix(in srgb, ${color} 14%, white)`
                      : "#f1f5f9",
                    color: earned ? color : "#94a3b8",
                  }}
                >
                  <FaCircleInfo className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-400">
                    {t({ ro: "Cum se obține?", en: "How to get it?" })}
                  </p>
                  <p className="text-sm font-bold leading-snug text-slate-800">
                    {t(cfg.howTo)}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="px-6 pb-5 pt-4 space-y-3"
              >
                <div className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-xl">
                  <span className="text-xs font-semibold text-slate-500">
                    {t({ ro: "Categorie", en: "Category" })}
                  </span>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: earned
                        ? `color-mix(in srgb, ${color} 15%, white)`
                        : "#f1f5f9",
                      color: earned ? color : "#64748b",
                    }}
                  >
                    {t(cfg.group)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-xl">
                  <span className="text-xs font-semibold text-slate-500">
                    {t({ ro: "Stare", en: "Status" })}
                  </span>
                  {earned ? (
                    <span className="text-xs font-bold text-lime-700">
                      {t({ ro: "Obținut pe", en: "Earned on" })}{" "}
                      {new Date(badge.earnedAt).toLocaleDateString(
                        locale === "ro" ? "ro-RO" : "en-GB",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">
                      {t({ ro: "Neobținut", en: "Not earned" })}
                    </span>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.28 }}
                className="px-6 pb-6"
              >
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-2xl bg-[#123424] text-white font-bold text-sm hover:bg-[#1a4d36] transition-colors cursor-pointer"
                >
                  Okay!
                </button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
