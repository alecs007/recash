"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LuBike } from "react-icons/lu";

interface CollectConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  post: {
    bottleCount: number;
    locationName: string | null;
    collectorSharePercent: number;
    estimatedValue: number;
  } | null;
  loading: boolean;
}

export function CollectConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  post,
  loading,
}: CollectConfirmModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onCancel]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (typeof document === "undefined" || !post) return null;

  const steps = [
    {
      color: "bg-lime-100 text-lime-700",
      label: "Cererea ta de colectare este trimisă autorului.",
    },
    {
      color: "bg-amber-100 text-amber-700",
      label:
        "Dacă este aprobată, ai 60 min la dispoziție să ajungi la locație.",
    },
    {
      color: "bg-blue-100 text-blue-800",
      label:
        "Odată ajuns, oferi prețul stabilit autorului și colectezi sticlele.",
    },
    {
      color: "bg-slate-100 text-slate-600",
      label:
        "Introduci codul de confirmare primit de la autor și totul este gata!",
    },
  ];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            ref={overlayRef}
            onClick={(e) => {
              if (e.target === overlayRef.current) onCancel();
            }}
            className="fixed inset-0 z-[9990] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              key="modal"
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6">
                <div className="space-y-6 mb-6">
                  {steps.map(({ color, label }, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.07, duration: 0.28 }}
                      className="flex items-center gap-3"
                    >
                      <div
                        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${color}`}
                      >
                        {i + 1}
                      </div>
                      <p className="text-sm font-semibold text-slate-700 leading-snug">
                        {label}
                      </p>
                    </motion.div>
                  ))}
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={onCancel}
                    disabled={loading}
                    className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    Anulează
                  </button>
                  <motion.button
                    onClick={onConfirm}
                    disabled={loading}
                    whileTap={{ scale: 0.97 }}
                    className="flex-[1.6] flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#123424] text-white font-bold text-sm hover:bg-[#1a4d36] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {loading && (
                      <svg
                        className="w-4 h-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeOpacity="0.25"
                        />
                        <path
                          d="M12 3a9 9 0 0 1 9 9"
                          stroke="#a3e635"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                    {loading ? "Se încarcă..." : "Am înțeles, colectez!"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
