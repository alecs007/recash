"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { RadioTower, X } from "lucide-react";

const DISMISSED_KEY = "radar-teaser-dismissed";

export function RadarTeaser() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[800] w-[calc(100%-2rem)] max-w-sm pointer-events-auto"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/60 overflow-hidden">
            <div className="h-[3px] w-full bg-gradient-to-r from-lime-400 to-lime-500" />
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-[#123424] flex items-center justify-center shrink-0">
                <RadioTower className="w-4 h-4 text-lime-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 leading-tight">
                  Activează radarul
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Notificări când apar sticle lângă tine
                </p>
              </div>
              <Link
                href="/profil#radar"
                onClick={dismiss}
                className="shrink-0 text-xs font-bold text-[#123424] bg-lime-50 border border-lime-200 px-3 py-1.5 rounded-xl hover:bg-lime-100 transition-colors cursor-pointer"
              >
                Setează
              </Link>
              <button
                onClick={dismiss}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Închide"
              >
                <X className="w-3 h-3 text-slate-500" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
