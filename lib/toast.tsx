"use client";

import { toast } from "sonner";
import { X } from "lucide-react";
import { ComponentType } from "react";
import {
  FaBan,
  FaCheck,
  FaExclamationTriangle,
  FaInfo,
  FaTruck,
  FaStar,
  FaBroadcastTower,
} from "react-icons/fa";

export type ToastVariant =
  | "success"
  | "info"
  | "warning"
  | "error"
  | "courier"
  | "rating"
  | "radar";

type VariantCfg = {
  Icon: ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
};

const VARIANT_CONFIG: Record<ToastVariant, VariantCfg> = {
  success: {
    Icon: FaCheck,
    color: "text-lime-700",
    bg: "bg-lime-50",
    border: "border-lime-200",
  },
  info: {
    Icon: FaInfo,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  warning: {
    Icon: FaExclamationTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  error: {
    Icon: FaBan,
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  courier: {
    Icon: FaTruck,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  rating: {
    Icon: FaStar,
    color: "text-yellow-500",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
  },
  radar: {
    Icon: FaBroadcastTower,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
  },
};

export function showToast(
  variant: ToastVariant,
  title: string,
  message?: string,
  link?: string,
) {
  const cfg = VARIANT_CONFIG[variant];
  const Icon = cfg.Icon;

  toast.custom(
    (toastId) => (
      <div
        style={{ width: 356 }}
        onClick={() => {
          if (link) {
            window.location.href = link;
            toast.dismiss(toastId);
          }
        }}
        className={[
          "flex items-start gap-3 bg-white rounded-2xl border shadow-sm p-4 transition-all",
          cfg.border,
          link ? "cursor-pointer hover:bg-slate-50 active:scale-[0.98]" : "",
        ].join(" ")}
      >
        <div
          className={`shrink-0 w-9 h-9 rounded-full ${cfg.bg} border ${cfg.border} flex items-center justify-center`}
        >
          <Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 leading-snug">
            {title}
          </p>
          {message && (
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
              {message}
            </p>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            toast.dismiss(toastId);
          }}
          className="shrink-0 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    ),
    { duration: 4500 },
  );
}
