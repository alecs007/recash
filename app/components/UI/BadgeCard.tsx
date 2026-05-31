"use client";

import { useState } from "react";
import Image from "next/image";
import { BADGE_CONFIG, BADGE_COLORS } from "@/lib/constants/badges";
import { BadgeModal } from "./BadgeModal";

export type BadgeData = {
  id: string;
  type: string;
  earnedAt: string;
  seen: boolean;
};

type Props = {
  badge: BadgeData;
  onSeen?: (id: string) => void;
  earned?: boolean;
};

async function markBadgeSeen(id: string) {
  await fetch("/api/v1/profile/badges/seen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: [id] }),
  });
}

export function BadgeCard({ badge, onSeen, earned = true }: Props) {
  const [seen, setSeen] = useState(badge.seen);
  const [modalOpen, setModalOpen] = useState(false);

  const cfg = BADGE_CONFIG[badge.type];
  if (!cfg) return null;

  const color = earned ? (BADGE_COLORS[badge.type] ?? "#64748B") : "#CBD5E1";
  const isNew = earned && !seen;

  const handleOpenModal = async () => {
    setModalOpen(true);
    if (isNew) {
      setSeen(true);
      onSeen?.(badge.id);
      try {
        await markBadgeSeen(badge.id);
      } catch {
        setSeen(false);
      }
    }
  };

  return (
    <>
      <div
        className={[
          "relative flex flex-col items-center gap-3 p-4 rounded-2xl border bg-white transition-all select-none",
          earned
            ? isNew
              ? "border-lime-300 shadow-[0_0_0_2px_rgba(163,230,53,0.35)]"
              : "border-slate-200"
            : "border-slate-100 opacity-40 grayscale",
        ].join(" ")}
      >
        {isNew && (
          <span className="absolute -top-2 -right-2 z-10 bg-lime-400 text-[#123424] text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none shadow-sm tracking-wide">
            NOU
          </span>
        )}

        <div className="relative w-[56px] h-[63px] flex-shrink-0">
          <div
            className="absolute inset-0"
            style={{
              clipPath:
                "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              backgroundColor: earned
                ? `color-mix(in srgb, ${color} 60%, black)`
                : "#94a3b8",
            }}
          />
          <div
            className="absolute"
            style={{
              inset: "2.5px",
              clipPath:
                "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              backgroundColor: earned ? color : "#cbd5e1",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              width={128}
              height={128}
              priority
              draggable={false}
              src={cfg.image}
              alt={cfg.label}
              className="w-11 h-11 object-contain"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 text-center w-full">
          <p
            className="text-[11px] font-black leading-tight"
            style={{ color: earned ? color : "#64748b" }}
          >
            {cfg.label}
          </p>
          <p className="text-[9px] text-slate-600 leading-snug">{cfg.desc}</p>
        </div>

        <div className="w-full pt-2 border-t border-slate-100 text-center">
          <span className="text-[9px] font-semibold text-slate-600">
            {earned
              ? new Date(badge.earnedAt).toLocaleDateString("ro-RO", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "Neobținut"}
          </span>
        </div>

        <button
          onClick={handleOpenModal}
          className="w-full py-1.5 rounded-xl text-[10px] font-bold text-white transition-all cursor-pointer hover:opacity-90 active:scale-[0.97]"
          style={{ backgroundColor: earned ? color : "#94a3b8" }}
        >
          Check it out!
        </button>
      </div>

      <BadgeModal
        badge={modalOpen ? badge : null}
        earned={earned}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

export function BadgeCardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-white animate-pulse">
      <div
        className="w-[56px] h-[63px] bg-slate-100"
        style={{
          clipPath:
            "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
        }}
      />
      <div className="flex flex-col items-center gap-1.5 w-full">
        <div className="h-2.5 w-14 bg-slate-100 rounded" />
        <div className="h-2 w-12 bg-slate-100 rounded" />
      </div>
      <div className="w-full pt-2 border-t border-slate-100">
        <div className="h-2 w-10 bg-slate-100 rounded mx-auto" />
      </div>
      <div className="w-full h-6 bg-slate-100 rounded-xl" />
    </div>
  );
}
