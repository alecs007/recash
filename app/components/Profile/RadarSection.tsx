"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RadioTower,
  MapPin,
  Mail,
  MailX,
  Power,
  PowerOff,
  Pencil,
  Plus,
  Loader2,
} from "lucide-react";
import useSWR from "swr";
import {
  RadarConfigModal,
  type RadarConfig,
} from "@/app/components/UI/RadarConfigModal";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const RADIUS_COLORS: Record<number, string> = {
  1: "text-lime-600 bg-lime-50 border-lime-200",
  2: "text-lime-600 bg-lime-50 border-lime-200",
  5: "text-blue-600 bg-blue-50 border-blue-200",
  10: "text-blue-600 bg-blue-50 border-blue-200",
  25: "text-violet-600 bg-violet-50 border-violet-200",
  50: "text-orange-600 bg-orange-50 border-orange-200",
};

export function RadarSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const { data, mutate, isLoading } = useSWR<{ radar: RadarConfig | null }>(
    "/api/v1/radar",
    fetcher,
    { revalidateOnFocus: true },
  );

  const radar = data?.radar ?? null;

  const handleSaved = useCallback(
    (updated: RadarConfig) => {
      mutate({ radar: updated }, { revalidate: false });
      setModalOpen(false);
    },
    [mutate],
  );

  const handleDeleted = useCallback(() => {
    mutate({ radar: null }, { revalidate: false });
    setModalOpen(false);
  }, [mutate]);

  const toggleActive = useCallback(async () => {
    if (!radar) return;
    setToggling(true);
    try {
      const res = await fetch("/api/v1/radar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !radar.active }),
      });
      const d = await res.json();
      if (res.ok) mutate({ radar: d.radar }, { revalidate: false });
    } catch {}
    setToggling(false);
  }, [radar, mutate]);

  if (isLoading) {
    return (
      <div className="mx-4 sm:mx-6 lg:mx-8 mb-8 p-4 sm:p-6 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-slate-200" />
          <div className="h-5 w-32 bg-slate-200 rounded-lg" />
        </div>
        <div className="h-20 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <div className="mx-4 sm:mx-6 lg:mx-8 mb-8 p-4 sm:p-6 bg-slate-50 border border-slate-100 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#123424] flex items-center justify-center">
              <RadioTower className="w-4 h-4 text-lime-400" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Radar
            </h2>
            {radar && (
              <AnimatePresence mode="wait">
                <motion.span
                  key={radar.active ? "active" : "paused"}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wide ${
                    radar.active
                      ? "bg-lime-100 text-lime-700 border-lime-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}
                >
                  {radar.active ? "Activ" : "Oprit"}
                </motion.span>
              </AnimatePresence>
            )}
          </div>

          {radar ? (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editează
            </button>
          ) : (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 text-sm font-bold text-white bg-[#123424] hover:bg-[#1a4d36] px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Configurează
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!radar ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <RadioTower className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700 mb-1">
                Radarul nu e configurat
              </p>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Setează o zonă și primești notificări imediat ce apar sticle
                lângă tine.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 bg-[#123424] text-white font-bold px-5 py-2.5 rounded-full text-sm hover:bg-[#1a4d36] transition-colors cursor-pointer"
              >
                <RadioTower className="w-4 h-4 text-lime-400" />
                Activează Radarul
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="configured"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="bg-white border border-slate-100 rounded-2xl overflow-hidden"
            >
              <div className="flex items-center gap-4 p-4">
                <div className="relative shrink-0 w-14 h-14 flex items-center justify-center">
                  {radar.active && (
                    <>
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-lime-400/40"
                        animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                        transition={{
                          duration: 1.8,
                          repeat: Infinity,
                          ease: "easeOut",
                        }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-lime-400/25"
                        animate={{ scale: [1, 2.4], opacity: [0.4, 0] }}
                        transition={{
                          duration: 1.8,
                          repeat: Infinity,
                          ease: "easeOut",
                          delay: 0.6,
                        }}
                      />
                    </>
                  )}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${radar.active ? "bg-lime-50 border-2 border-lime-300" : "bg-slate-100 border-2 border-slate-200"}`}
                  >
                    <RadioTower
                      className={`w-5 h-5 ${radar.active ? "text-lime-600" : "text-slate-400"}`}
                    />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${RADIUS_COLORS[radar.radiusKm] ?? RADIUS_COLORS[5]}`}
                    >
                      {radar.radiusKm} km
                    </span>
                  </div>
                  {radar.locationName && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">
                        {radar.locationName}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                    {radar.emailEnabled ? (
                      <>
                        <Mail className="w-3 h-3 text-lime-500" />
                        <span className="text-lime-600 font-semibold">
                          Email activat
                        </span>
                      </>
                    ) : (
                      <>
                        <MailX className="w-3 h-3" />
                        <span>Fără email</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={toggleActive}
                  disabled={toggling}
                  className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all cursor-pointer disabled:opacity-50 ${
                    radar.active
                      ? "bg-white border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600 hover:bg-red-50"
                      : "bg-white border-slate-200 text-slate-600 hover:border-lime-300 hover:text-lime-700 hover:bg-lime-50"
                  }`}
                >
                  {toggling ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : radar.active ? (
                    <PowerOff className="w-3.5 h-3.5" />
                  ) : (
                    <Power className="w-3.5 h-3.5" />
                  )}
                  {radar.active ? "Oprește" : "Pornește"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RadarConfigModal
        isOpen={modalOpen}
        existing={radar}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </>
  );
}
