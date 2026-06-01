"use client";

import Link from "next/link";
import { FaMedal, FaTrophy, FaStar, FaLeaf, FaRecycle } from "react-icons/fa";

interface Props {
  rank: number;
  totalBottles: number;
}

export function ProfileRankBadge({ rank, totalBottles }: Props) {
  if (!rank || totalBottles === 0) return null;

  const cfg = (() => {
    if (rank === 1)
      return {
        Icon: FaMedal,
        label: "Locul 1 pe Recash",
        bg: "bg-amber-400/20",
        text: "text-amber-300",
        border: "border-amber-400/40",
        iconColor: "text-amber-400",
      };
    if (rank === 2)
      return {
        Icon: FaMedal,
        label: "Locul 2 pe Recash",
        bg: "bg-slate-400/20",
        text: "text-slate-300",
        border: "border-slate-400/40",
        iconColor: "text-slate-400",
      };
    if (rank === 3)
      return {
        Icon: FaMedal,
        label: "Locul 3 pe Recash",
        bg: "bg-orange-400/20",
        text: "text-orange-300",
        border: "border-orange-400/40",
        iconColor: "text-orange-400",
      };
    if (rank <= 10)
      return {
        Icon: FaTrophy,
        label: `Top 10 Recash`,
        bg: "bg-lime-400/20",
        text: "text-lime-300",
        border: "border-lime-400/30",
        iconColor: "text-lime-400",
      };
    if (rank <= 50)
      return {
        Icon: FaStar,
        label: `Top 50 Recash`,
        bg: "bg-sky-400/20",
        text: "text-sky-300",
        border: "border-sky-400/30",
        iconColor: "text-sky-400",
      };
    if (rank <= 100)
      return {
        Icon: FaLeaf,
        label: `Top 100 Recash`,
        bg: "bg-teal-400/20",
        text: "text-teal-300",
        border: "border-teal-400/30",
        iconColor: "text-teal-400",
      };
    return {
      Icon: FaRecycle,
      label: `#${rank} în clasament`,
      bg: "bg-white/10",
      text: "text-white/70",
      border: "border-white/15",
      iconColor: "text-white/50",
    };
  })();

  return (
    <Link
      href="/leaderboard"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${cfg.bg} ${cfg.text} ${cfg.border} hover:brightness-110`}
    >
      <cfg.Icon className={`w-3 h-3 ${cfg.iconColor}`} />
      {cfg.label}
    </Link>
  );
}
