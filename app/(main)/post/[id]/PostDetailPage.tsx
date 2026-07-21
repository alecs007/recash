"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { usePostLive } from "@/hooks/usePostLive";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  Phone,
  X,
  RefreshCw,
  Loader2,
  Calendar,
  LockKeyholeOpen,
  AlertTriangle,
  Users,
} from "lucide-react";
import { FaWineBottle, FaInfoCircle } from "react-icons/fa";
import { GrSend } from "react-icons/gr";
import { TbCancel } from "react-icons/tb";
import { PostStatus, Post } from "@/types";
import type { Map as LeafletMap } from "leaflet";
import { CollectConfirmModal } from "@/app/components/UI/CollectConfirmModal";
import { useSession } from "next-auth/react";
import { useAuthModal } from "@/context/AuthModalContext";
import { useSetActiveCounts } from "@/hooks/useActiveCounts";
import { useRecashSocket } from "@/hooks/useRecashSocket";
import { PostChat, ChatTriggerButton } from "./PostChat";
import { usePostChat } from "@/hooks/usePostChat";
import { EmailOptinPopup } from "@/app/components/UI/EmailOptinPopup";
import { showToast } from "@/lib/toast";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { isCurrentlyAvailable } from "@/lib/availability";
import type { DaySchedule } from "@/lib/availability";
import { VerifiedBadge } from "@/app/components/UI/VerifiedBadge";
import { UserHoverCard } from "@/app/components/UI/UserHoverCard";
import { useI18n } from "@/context/I18nContext";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_CONFIG: Record<
  PostStatus,
  { label: { ro: string; en: string }; className: string }
> = {
  OPEN: {
    label: { ro: "Disponibil", en: "Available" },
    className: "bg-emerald-100 text-emerald-700",
  },
  CLAIMED: {
    label: { ro: "Cerere în așteptare", en: "Request pending" },
    className: "bg-blue-100 text-blue-700",
  },
  IN_PROGRESS: {
    label: { ro: "Colectare în desfăşurare", en: "Collection in progress" },
    className: "bg-amber-100 text-amber-700",
  },
  COMPLETED: {
    label: { ro: "Finalizat", en: "Completed" },
    className: "bg-lime-100 text-lime-700",
  },
  CANCELLED: {
    label: { ro: "Anulat", en: "Cancelled" },
    className: "bg-red-100 text-red-600",
  },
  EXPIRED: {
    label: { ro: "Expirat", en: "Expired" },
    className: "bg-slate-100 text-slate-500",
  },
};

const EASE = [0.22, 1, 0.36, 1] as const;

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.38, ease: EASE },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
  },
};

const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: EASE, delay: i * 0.05 },
  }),
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
};

function MapQuickNav({
  lat,
  lng,
  showExact,
  isCollectorPending,
  status,
}: {
  lat: number;
  lng: number;
  showExact: boolean;
  isCollectorPending: boolean;
  status: PostStatus;
}) {
  const { t } = useI18n();
  if (status === "CANCELLED" || status === "EXPIRED") return null;

  if (!showExact) {
    return (
      <div className="absolute bottom-3 left-3 z-[1000]">
        <div className="flex items-start max-w-xs gap-2.5 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl px-3.5 py-3 text-xs text-slate-500 font-medium shadow-sm">
          <FaInfoCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
          {isCollectorPending
            ? t({
                ro: "Locația exactă va fi disponibilă după ce autorul îți aprobă cererea.",
                en: "The exact location will be available after the author approves your request.",
              })
            : t({
                ro: "Locația exactă este vizibilă doar participanților la această colectare.",
                en: "The exact location is only visible to participants in this collection.",
              })}
        </div>
      </div>
    );
  }

  const links = [
    {
      label: "Google Maps",
      icon: "/images/icons/google-maps.svg",
      url: `https://www.google.com/maps?q=${lat},${lng}`,
    },
    {
      label: "Waze",
      icon: "/images/icons/waze-icon.svg",
      url: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
    },
    {
      label: "Apple Maps",
      icon: "/images/icons/apple-maps-icon.svg",
      url: `https://maps.apple.com/?q=${lat},${lng}`,
    },
  ];

  return (
    <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2">
      {links.map((b, i) => (
        <motion.a
          key={b.label}
          href={b.url}
          target="_blank"
          rel="noopener noreferrer"
          title={b.label}
          aria-label={b.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.3, ease: EASE }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.92 }}
          className="w-10 h-10 rounded-full bg-white shadow border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <Image
            src={b.icon}
            alt={b.label}
            width={20}
            height={20}
            draggable={false}
            className="w-5 h-5 object-contain"
          />
        </motion.a>
      ))}
    </div>
  );
}

function PostMap({
  lat,
  lng,
  locationName,
  showExact = true,
}: {
  lat: number;
  lng: number;
  locationName: string | null;
  showExact?: boolean;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.L) {
      const frame = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(frame);
    }
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
    }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.async = true;
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!ready || !ref.current || mapRef.current) return;
    const L = window.L;
    let centerLat = lat;
    let centerLng = lng;

    if (!showExact) {
      let h = 5381;
      const id = `${lat}${lng}`;
      for (let i = 0; i < id.length; i++) h = ((h << 5) + h) ^ id.charCodeAt(i);
      h = Math.abs(h);
      const angle = (h % 628) / 100;
      const offsetMeters = 50;
      centerLat = lat + (offsetMeters / 111320) * Math.sin(angle);
      centerLng =
        lng +
        (offsetMeters / (111320 * Math.cos((lat * Math.PI) / 180))) *
          Math.cos(angle);
    }

    const map = L.map(ref.current, {
      center: [centerLat, centerLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    const icon = L.divIcon({
      className: "custom-map-pin",
      html: `<div style="position:relative;width:32px;height:32px;background-color:#f73138;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 5px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><div style="width:14px;height:14px;background-color:#ffffff;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(45deg);"></div></div>`,
      iconSize: [32, 44],
      iconAnchor: [16, 44],
    });

    if (!showExact) {
      let h = 5381;
      const id = `${lat}${lng}`;
      for (let i = 0; i < id.length; i++) h = ((h << 5) + h) ^ id.charCodeAt(i);
      h = Math.abs(h);
      const angle = (h % 628) / 100;
      const offsetMeters = 50;
      const radiusMeters = 90;
      const displayLat = lat + (offsetMeters / 111320) * Math.sin(angle);
      const displayLng =
        lng +
        (offsetMeters / (111320 * Math.cos((lat * Math.PI) / 180))) *
          Math.cos(angle);

      (L as any)
        .circle([displayLat, displayLng], {
          radius: radiusMeters,
          color: "#64748b",
          fillColor: "#94a3b8",
          fillOpacity: 0.15,
          weight: 1.5,
          dashArray: "3 5",
        })
        .addTo(map);

      L.marker([displayLat, displayLng], { icon })
        .addTo(map)
        .bindPopup(
          `<strong>${t({ ro: "Locație aproximativă", en: "Approximate location" })}</strong>`,
        );
    } else {
      L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(
          `<strong>${locationName ?? t({ ro: "Locația sticlelor", en: "Bottle location" })}</strong>`,
        );
    }
    mapRef.current = map;

    let offsetRaf: number | null = null;
    if (window.innerWidth < 1024) {
      offsetRaf = requestAnimationFrame(() => {
        if (!mapRef.current) return;
        const h = map.getSize().y;
        map.panBy([0, h / 20], { animate: false });
      });
    }

    return () => {
      if (offsetRaf !== null) cancelAnimationFrame(offsetRaf);
      map.remove();
      mapRef.current = null;
    };
  }, [ready, lat, lng, locationName]);

  return (
    <div ref={ref} className="w-full h-full bg-slate-100 relative">
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      )}
    </div>
  );
}

function Countdown({
  deadline,
  onEnd,
}: {
  deadline: string;
  onEnd?: () => void;
}) {
  const { t } = useI18n();
  const [ms, setMs] = useState(0);
  const endedRef = useRef(false);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);
  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, new Date(deadline).getTime() - Date.now());
      setMs(left);
      if (left === 0 && !endedRef.current) {
        endedRef.current = true;
        onEndRef.current?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  const total = 30 * 60 * 1000;
  const pct = Math.min(100, (ms / total) * 100);
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const expired = ms === 0;
  const urgent = ms < 5 * 60 * 1000 && !expired;
  const color = expired ? "#ef4444" : urgent ? "#f97316" : "#A3E635";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span
          className={`font-semibold ${expired ? "text-red-500" : urgent ? "text-orange-500" : "text-slate-700"}`}
        >
          {expired
            ? t({ ro: "Timp expirat", en: "Time's up" })
            : urgent
              ? t({ ro: "Grăbește-te!", en: "Hurry up!" })
              : t({ ro: "Timp rămas", en: "Time left" })}
        </span>
        <motion.span
          key={`${mins}:${secs}`}
          initial={{ opacity: 0.6, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
          className={`text-3xl font-black tabular-nums tracking-tight ${expired ? "text-red-500" : urgent ? "text-orange-500" : "text-lime-600"}`}
        >
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </motion.span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "linear" }}
        />
      </div>
    </div>
  );
}

function CodeDisplay({ postId }: { postId: string }) {
  const { t } = useI18n();
  const { data, error, isLoading, mutate } = useSWR(
    `/api/v1/posts/${postId}/code`,
    fetcher,
    { revalidateOnFocus: false },
  );
  if (isLoading)
    return (
      <div className="flex gap-2 justify-center">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-15 h-15 bg-slate-100 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  if (error || !data?.code)
    return (
      <div className="text-center">
        <p className="text-sm text-red-500 mb-2">
          {t({
            ro: "Nu s-a putut obține codul.",
            en: "Couldn't retrieve the code.",
          })}
        </p>
        <button
          onClick={() => mutate()}
          className="flex items-center gap-1 mx-auto text-xs text-slate-500 hover:text-slate-700"
        >
          <RefreshCw className="w-3 h-3" />{" "}
          {t({ ro: "Reîncearcă", en: "Retry" })}
        </button>
      </div>
    );
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="space-y-3"
    >
      <div className="flex gap-2 justify-center">
        {data.code.split("").map((ch: string, i: number) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3, ease: EASE }}
            className="w-14 h-14 flex items-center justify-center bg-slate-100 rounded-lg border border-slate-200"
          >
            <span className="text-3xl tabular-nums font-black text-[#123424]">
              {ch}
            </span>
          </motion.div>
        ))}
      </div>
      <p className="text-xs text-slate-500 text-center">
        {t({
          ro: "Arată acest cod colectorului când ajunge la tine",
          en: "Show this code to the collector when they arrive",
        })}
      </p>
    </motion.div>
  );
}

function CodeEntry({
  postId,
  onSuccess,
  onComplete,
}: {
  postId: string;
  onSuccess: () => void;
  onComplete: () => void;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    const c = code.trim().toUpperCase();
    if (c.length !== 4) {
      setError(
        t({
          ro: "Introdu codul de 4 caractere.",
          en: "Enter the 4-character code.",
        }),
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/posts/${postId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? t({ ro: "Eroare", en: "Error" }));
        setLoading(false);
        return;
      }
      setSuccess(true);
      onSuccess();
      setTimeout(() => onComplete(), 2800);
    } catch {
      setError(t({ ro: "Eroare de rețea.", en: "Network error." }));
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="space-y-4"
    >
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="flex items-center justify-center gap-3 py-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 18,
                delay: 0.1,
              }}
              className="w-10 h-10 rounded-full bg-lime-100 border border-lime-300 flex items-center justify-center"
            >
              <CheckCircle className="w-5 h-5 text-lime-600" />
            </motion.div>
            <span className="font-bold text-lime-700">
              {t({ ro: "Cod confirmat!", en: "Code confirmed!" })}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
          >
            <input
              type="text"
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 4),
                )
              }
              placeholder="A3BC"
              maxLength={4}
              autoCapitalize="characters"
              className="w-full px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-lime-400 outline-none text-3xl font-black text-center tracking-[0.5em] text-slate-900 bg-white uppercase transition-colors"
            />
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm text-red-500 font-medium mt-2 overflow-hidden"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            <motion.button
              onClick={submit}
              disabled={loading || code.length !== 4}
              whileTap={{ scale: 0.97 }}
              className="mt-4 w-full py-3.5 rounded-xl bg-[#123424] text-white font-bold text-sm hover:bg-[#1a4d36] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {t({ ro: "Confirmă colectarea", en: "Confirm collection" })}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ReviewForm({
  postId,
  targetName,
  alreadyReviewed,
  onDone,
}: {
  postId: string;
  targetName: string;
  alreadyReviewed: boolean;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  if (alreadyReviewed || done) return;
  const submit = async () => {
    if (!rating) {
      setError(t({ ro: "Alege un rating", en: "Choose a rating" }));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/posts/${postId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, review: review.trim() || null }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? t({ ro: "Eroare", en: "Error" }));
        setLoading(false);
        return;
      }
      setDone(true);
      onDone();
    } catch {
      setError(t({ ro: "Eroare de rețea.", en: "Network error." }));
      setLoading(false);
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="space-y-3 pt-2"
    >
      <p className="text-sm text-slate-600">
        {t({
          ro: (
            <>
              Cum a decurs experiența cu <strong>{targetName}</strong>?
            </>
          ),
          en: (
            <>
              How was your experience with <strong>{targetName}</strong>?
            </>
          ),
        })}
      </p>
      <div className="flex -m-1 w-fit" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((s) => (
          <motion.button
            key={s}
            type="button"
            onClick={() => setRating(s)}
            onMouseEnter={() => setHover(s)}
            whileTap={{ scale: 1.2 }}
            className="cursor-pointer p-1"
          >
            <Star
              className={`w-7 h-7 transition-colors ${s <= (hover || rating) ? "text-[#FFDF00] fill-[#FFDF00]" : "text-slate-200"}`}
            />
          </motion.button>
        ))}
      </div>
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder={t({
          ro: "Lasă un comentariu (opțional)...",
          en: "Leave a comment (optional)...",
        })}
        rows={2}
        maxLength={500}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-lime-400 outline-none bg-white transition-colors"
      />
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-red-500 overflow-hidden"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      <motion.button
        onClick={submit}
        disabled={loading || !rating}
        whileTap={{ scale: 0.97 }}
        className="w-full py-3 rounded-xl bg-lime-400 text-black font-bold text-sm hover:bg-lime-300 disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:cursor-not-allowed"
      >
        {loading
          ? t({ ro: "Se trimite...", en: "Sending..." })
          : t({ ro: "Trimite rating", en: "Submit rating" })}
        {!loading && <GrSend className="w-4 h-4" />}
      </motion.button>
    </motion.div>
  );
}

function CancelModal({
  onConfirm,
  onClose,
  isInProgress,
}: {
  onConfirm: () => void;
  onClose: () => void;
  isInProgress: boolean;
}) {
  const { t } = useI18n();
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 8 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-bold text-slate-900">
            {t({
              ro: "Ești sigur că vrei să anulezi?",
              en: "Are you sure you want to cancel?",
            })}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-slate-600" />
          </button>
        </div>
        <AnimatePresence>
          {isInProgress && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-600 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                {t({
                  ro: "Anularea în timp ce colectarea este activă îți va afecta scorul de reputație.",
                  en: "Cancelling while the collection is active will affect your reputation score.",
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm cursor-pointer hover:border-slate-300 transition-all"
          >
            {t({ ro: "Înapoi", en: "Back" })}
          </button>
          <motion.button
            onClick={onConfirm}
            whileTap={{ scale: 0.96 }}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm cursor-pointer hover:bg-red-600 transition-all"
          >
            {t({ ro: "Anulează", en: "Cancel" })}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

function PersonRow({
  user,
  role,
  showPhone,
}: {
  user: Post["author"] | NonNullable<Post["collector"]>;
  role: string;
  showPhone?: boolean;
}) {
  const { t } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="flex items-center gap-3"
    >
      <UserHoverCard userId={user.id}>
        <Link
          href={`/user/${user.id}`}
          className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 hover:ring-2 hover:ring-lime-400 hover:ring-offset-1 transition-all"
        >
          {user.image ? (
            <Image
              src={user.image}
              alt=""
              width={40}
              height={40}
              priority
              draggable={false}
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="text-sm font-bold text-slate-500">
              {user.name?.[0] ?? "?"}
            </span>
          )}
        </Link>
      </UserHoverCard>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <UserHoverCard userId={user.id}>
            <Link
              href={`/user/${user.id}`}
              className="text-sm font-semibold text-slate-900 hover:text-lime-700 transition-colors truncate flex items-center gap-0.5"
            >
              {user.name ?? t({ ro: "Utilizator", en: "User" })}
              {user.certified && <VerifiedBadge className="w-4 h-4 shrink-0" />}
            </Link>
          </UserHoverCard>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
            {role}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <Star className="w-3 h-3 text-[#FFDF00] fill-[#FFDF00]" />
          <span className="text-xs text-slate-500">
            {user.reputationScore.toFixed(1)}{" "}
            <span className="text-slate-400">({user.ratingCount})</span>
          </span>
        </div>
        {showPhone && user.phone && (
          <a
            href={`tel:${user.phone}`}
            className="flex items-center gap-1 mt-0.5 text-xs font-medium text-[#123424] hover:underline"
          >
            <Phone className="w-3 h-3" />
            {user.phone}
          </a>
        )}
      </div>
    </motion.div>
  );
}

function ExpiryText({ expiresAt }: { expiresAt: string | null }) {
  const { t, locale } = useI18n();
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!expiresAt) return;
    const calc = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setLabel(t({ ro: "Expirat", en: "Expired" }));
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const d = Math.floor(h / 24);
      const dU = locale === "ro" ? "z" : "d";
      const prefix = t({ ro: "Expiră în", en: "Expires in" });
      setLabel(
        d > 0
          ? `${prefix} ${d}${dU} ${h % 24 > 0 ? `${h % 24}h ` : ""} ${m}min`
          : `${prefix} ${h > 0 ? `${h}h ` : ""} ${m}min`,
      );
    };
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [expiresAt, t, locale]);
  if (!label) return null;
  return <span className="text-xs text-slate-400">{label}</span>;
}

function NavButtons({
  lat,
  lng,
  showExact,
}: {
  lat: number;
  lng: number;
  showExact?: boolean;
}) {
  if (!showExact) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        {
          label: "Google Maps",
          icon: "/images/icons/google-maps.svg",
          url: `https://www.google.com/maps?q=${lat},${lng}`,
        },
        {
          label: "Waze",
          icon: "/images/icons/waze-icon.svg",
          url: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
        },
        {
          label: "Apple Maps",
          icon: "/images/icons/apple-maps-icon.svg",
          url: `https://maps.apple.com/?q=${lat},${lng}`,
        },
      ].map((b, i) => (
        <motion.a
          key={b.label}
          href={b.url}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.3, ease: EASE }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          className="flex flex-col items-center gap-1 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-xs font-medium text-slate-600"
        >
          <Image
            src={b.icon}
            alt={b.label}
            width={20}
            height={20}
            draggable={false}
            className="w-9 aspect-square object-contain"
          />
          {b.label}
        </motion.a>
      ))}
    </div>
  );
}

function SkeletonPanel() {
  return (
    <div className="h-full overflow-y-auto animate-pulse">
      <div className="px-6 lg:px-10 py-6 lg:py-8 max-w-xl lg:max-w-none">
        <div className="flex items-center justify-between mb-7">
          <div className="h-4 w-28 bg-slate-100 rounded-full" />
          <div className="h-6 w-20 bg-slate-100 rounded-full" />
        </div>
        <div className="mb-7">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
            <div className="flex items-baseline gap-2">
              <div className="h-10 w-16 bg-slate-100 rounded-lg" />
              <div className="h-5 w-10 bg-slate-100 rounded-lg" />
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="flex items-baseline gap-1.5">
              <div className="h-9 w-24 bg-slate-100 rounded-lg" />
              <div className="h-4 w-8 bg-slate-100 rounded-lg" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className="h-3.5 w-3.5 bg-slate-100 rounded-full" />
            <div className="h-3.5 w-40 bg-slate-100 rounded-lg" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3.5 w-full bg-slate-100 rounded-lg" />
            <div className="h-3.5 w-4/5 bg-slate-100 rounded-lg" />
          </div>
        </div>
        <div className="h-px bg-slate-100 mb-7" />
        <div className="mb-7">
          <div className="flex items-baseline gap-2 mb-1">
            <div className="h-4 w-20 bg-slate-100 rounded-lg" />
            <div className="h-9 w-28 bg-slate-100 rounded-lg" />
            <div className="h-5 w-10 bg-slate-100 rounded-lg" />
          </div>
          <div className="mt-3 h-2.5 bg-slate-100 rounded-full" />
        </div>
        <div className="h-px bg-slate-100 mb-7" />
        <div className="mb-7 space-y-3">
          <div className="h-4 w-3/4 bg-slate-100 rounded-lg" />
          <div className="h-3.5 w-1/2 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-px bg-slate-100 mb-7" />
        <div className="space-y-4 mb-7">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-28 bg-slate-100 rounded-lg" />
                  <div className="h-4 w-12 bg-slate-100 rounded-full" />
                </div>
                <div className="h-3 w-16 bg-slate-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-px bg-slate-100 mb-7" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 bg-white"
            >
              <div className="w-9 h-9 bg-slate-100 rounded-lg" />
              <div className="h-3 w-14 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <>
      <div className="lg:hidden flex flex-col min-h-[calc(100vh-var(--header-height))]">
        <div className="h-[260px] shrink-0 bg-slate-100 animate-pulse" />
        <div className="flex-1 bg-white">
          <SkeletonPanel />
        </div>
      </div>
      <div
        className="hidden lg:flex"
        style={{ height: "calc(100vh - var(--header-height))" }}
      >
        <div className="w-[55%] shrink-0 bg-slate-100 animate-pulse" />
        <div className="flex-1 bg-white border-l border-slate-100 overflow-hidden">
          <SkeletonPanel />
        </div>
      </div>
    </>
  );
}

function getCancelToastKey(status: PostStatus, isAuthor: boolean): string {
  if (status === "IN_PROGRESS") {
    return isAuthor
      ? "collection_cancelled_poster"
      : "collection_cancelled_collector";
  }
  if (status === "CLAIMED" && !isAuthor) {
    return "claim_cancelled";
  }
  return "post_cancelled";
}

function DetailPanel({
  post: livePost,
  userId,
  isAuthor,
  isCollector,
  mutate,
  onRedirect,
  showExactLocation,
  isCollectorPending,
}: {
  post: Post;
  userId: string;
  isAuthor: boolean;
  isCollector: boolean;
  mutate: () => void;
  onRedirect: (url: string) => void;
  showExactLocation: boolean;
  isCollectorPending: boolean;
}) {
  const { t, fmt, locale } = useI18n();
  const [showCancel, setShowCancel] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [justReviewed, setJustReviewed] = useState(false);
  const setActiveCounts = useSetActiveCounts();

  const [codeConfirmHold, setCodeConfirmHold] = useState(false);
  const post: Post =
    codeConfirmHold && livePost.status !== "IN_PROGRESS"
      ? { ...livePost, status: "IN_PROGRESS" }
      : livePost;

  const [chatOpen, setChatOpen] = useState(false);

  const chatVisible =
    (isAuthor || isCollector) &&
    !!post.collector &&
    ["IN_PROGRESS", "COMPLETED", "CANCELLED", "EXPIRED"].includes(post.status);
  const chatReadOnly = post.status !== "IN_PROGRESS";

  const { unread: chatUnread } = usePostChat(
    post.id,
    userId,
    chatVisible,
    chatOpen,
  );

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!post.availabilitySchedule) return;
    const timer = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(timer);
  }, [post.availabilitySchedule]);

  const schedule = post.availabilitySchedule as unknown as DaySchedule[] | null;
  const isUnavailableNow =
    (post.status === "OPEN" || post.status === "CLAIMED") &&
    !!schedule?.length &&
    !isCurrentlyAvailable(schedule);

  const isNonParticipant = !isAuthor && !isCollector;

  // Only the author ever sees more than one pending request, so pluralize the
  // CLAIMED pill just for them when several collectors have requested.
  const claimedPill =
    isAuthor && (post.pendingRequestCount ?? 0) > 1
      ? {
          label: t({
            ro: `${post.pendingRequestCount} cereri în așteptare`,
            en: `${post.pendingRequestCount} requests pending`,
          }),
          className: STATUS_CONFIG.CLAIMED.className,
        }
      : {
          label: t(STATUS_CONFIG.CLAIMED.label),
          className: STATUS_CONFIG.CLAIMED.className,
        };

  const statusCfg = isUnavailableNow
    ? {
        label: t({ ro: "Indisponibil", en: "Unavailable" }),
        className: "bg-orange-100 text-orange-700",
      }
    : post.status === "COMPLETED" && isNonParticipant
      ? {
          label: t({ ro: "Finalizat", en: "Completed" }),
          className: "bg-slate-100 text-slate-500",
        }
      : post.status === "CLAIMED"
        ? claimedPill
        : {
            label: t(STATUS_CONFIG[post.status].label),
            className: STATUS_CONFIG[post.status].className,
          };
  const posterPct = 100 - post.collectorSharePercent;
  const collectorEarning =
    Math.round(((post.estimatedValue * post.collectorSharePercent) / 100) * 2) /
    2;
  const posterEarning = post.estimatedValue - collectorEarning;

  const myActualEarning = post.transaction
    ? isAuthor
      ? post.transaction.posterEarning
      : post.transaction.collectorEarning
    : null;
  const targetName = isAuthor
    ? (post.collector?.name ?? t({ ro: "Colectorul", en: "The collector" }))
    : (post.author.name ?? t({ ro: "Autorul", en: "The author" }));

  const ratingIGave = isAuthor
    ? post.transaction?.posterRating
    : post.transaction?.collectorRating;

  const ratingIReceived = isAuthor
    ? post.transaction?.collectorRating
    : post.transaction?.posterRating;

  const reviewIGave = isAuthor
    ? post.transaction?.posterReview
    : post.transaction?.collectorReview;

  const reviewIReceived = isAuthor
    ? post.transaction?.collectorReview
    : post.transaction?.posterReview;

  const showCollector =
    post.collector &&
    (post.status === "IN_PROGRESS" ||
      post.status === "COMPLETED" ||
      post.status === "CANCELLED"); // || post.status === "CLAIMED" && isAuthor;

  const { data: session } = useSession();
  const { open: openAuthModal } = useAuthModal();
  const isLoggedIn = !!session?.user?.id;

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const handleClaimClick = () => {
    if (!isLoggedIn) {
      openAuthModal();
      return;
    }
    setShowClaimModal(true);
  };

  const handleClaimConfirmed = async () => {
    setClaiming(true);
    setClaimError(null);
    try {
      const res = await fetch(`/api/v1/posts/${post.id}/claim`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setShowClaimModal(false);
        setClaimError(
          json.error ??
            t({ ro: "Eroare la revendicare.", en: "Failed to claim." }),
        );
        setClaiming(false);
        return;
      }
      setShowClaimModal(false);
      setActiveCounts((c) => ({
        pendingRequests: c.pendingRequests + 1,
        pendingRequestPostId: c.pendingRequestPostId ?? post.id,
      }));
      await mutate();
    } catch {
      setShowClaimModal(false);
      setClaimError(
        t({
          ro: "Eroare de rețea. Încearcă din nou.",
          en: "Network error. Try again.",
        }),
      );
      setClaiming(false);
    }
  };

  const handleReviewDone = () => {
    setJustReviewed(true);
    mutate();
  };

  const [actionCollectorId, setActionCollectorId] = useState<string | null>(
    null,
  );

  const handleApprove = useCallback(
    async (action: "approve" | "deny", collectorId: string) => {
      setActionLoading(true);
      setActionCollectorId(collectorId);
      setActionError("");
      try {
        const res = await fetch(`/api/v1/posts/${post.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, collectorId }),
        });
        const j = await res.json();
        if (!res.ok) {
          setActionError(j.error ?? t({ ro: "Eroare", en: "Error" }));
          mutate();
        } else if (action === "deny") {
          showToast(
            "info",
            t({ ro: "Cerere refuzată", en: "Request declined" }),
            j.status === "OPEN"
              ? t({
                  ro: "Nu mai sunt cereri — anunțul tău este disponibil.",
                  en: "No requests left — your listing is available.",
                })
              : t({
                  ro: "Cererea a fost refuzată. Mai ai cereri în așteptare.",
                  en: "The request was declined. You still have pending requests.",
                }),
          );
          mutate();
        } else {
          showToast(
            "success",
            t({ ro: "Cerere aprobată!", en: "Request approved!" }),
            t({
              ro: "Colectorul are 60 de minute să ajungă la tine.",
              en: "The collector has 60 minutes to reach you.",
            }),
          );
          mutate();
        }
      } catch {
        setActionError(t({ ro: "Eroare de rețea.", en: "Network error." }));
      } finally {
        setActionLoading(false);
        setActionCollectorId(null);
      }
    },
    [post.id, mutate, t],
  );

  // Withdraw my own pending collect request (requesters are not post
  // participants, so this goes through DELETE /claim, not /cancel).
  const handleWithdraw = useCallback(async () => {
    setShowCancel(false);
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/v1/posts/${post.id}/claim`, {
        method: "DELETE",
      });
      const j = await res.json();
      if (!res.ok) {
        setActionError(j.error ?? t({ ro: "Eroare", en: "Error" }));
        setActionLoading(false);
        mutate();
        return;
      }

      setActiveCounts((c) => {
        const rest = c.pendingRequestsList.filter((r) => r.postId !== post.id);
        return {
          pendingRequests: Math.max(0, c.pendingRequests - 1),
          pendingRequestsList: rest,
          pendingRequestPostId: rest[0]?.postId ?? null,
        };
      });
      // actionLoading stays on — the redirect unmounts this view.
      onRedirect(`/?toast=claim_cancelled`);
    } catch {
      setActionError(t({ ro: "Eroare de rețea.", en: "Network error." }));
      setActionLoading(false);
    }
  }, [post.id, mutate, onRedirect, setActiveCounts, t]);

  const handleCancel = useCallback(async () => {
    setShowCancel(false);
    setActionLoading(true);
    setActionError("");
    const toastKey = getCancelToastKey(post.status, isAuthor);
    try {
      const res = await fetch(`/api/v1/posts/${post.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const j = await res.json();
      if (!res.ok) {
        setActionError(j.error ?? t({ ro: "Eroare", en: "Error" }));
      } else {
        if (isAuthor) {
          setActiveCounts({ activePosts: 0, activePostId: null });
        } else {
          setActiveCounts({ activeCollections: 0, activeCollectionId: null });
        }
        onRedirect(post.status === "IN_PROGRESS" ? "/" : `/?toast=${toastKey}`);
      }
    } catch {
      setActionError(t({ ro: "Eroare de rețea.", en: "Network error." }));
    } finally {
      setActionLoading(false);
    }
  }, [post.id, post.status, isAuthor, onRedirect, setActiveCounts, t]);

  interface RenderOptions {
    makeSignBigger?: boolean;
  }

  const renderFormattedPrice = (
    amount: number,
    fmtFn: (value: number, ...args: any[]) => string,
    options?: RenderOptions,
  ): React.ReactNode => {
    const formattedString = fmtFn(amount);
    const match = formattedString.match(/^(.*?)\s*([a-zA-Z€]+)$/);

    if (!match) return formattedString;

    const [, value, symbol] = match;
    const cleanSymbol = symbol.trim();

    const isEuro = cleanSymbol.toUpperCase() === "EUR" || cleanSymbol === "€";
    const shouldEnlarge = !!options?.makeSignBigger;

    let sizeClass = "text-lg";

    if (isEuro) {
      sizeClass = shouldEnlarge ? "text-2xl" : "text-lg";
    } else {
      sizeClass = shouldEnlarge ? "text-lg" : "text-sm";
    }
    return (
      <>
        {value.trim()}
        <span className={`font-normal text-slate-400 ml-1 ${sizeClass}`}>
          {cleanSymbol}
        </span>
      </>
    );
  };

  return (
    <div className="h-full w-full relative">
      <div className="h-full overflow-y-auto" data-lenis-prevent>
        <div className="px-6 lg:px-10 py-6 lg:py-8 space-y-0 max-w-2xl lg:max-w-none mx-auto">
          {/* ── BACK + STATUS ── */}
          <div className="flex items-center justify-between mb-7">
            <Link
              href={`/${isAuthor ? "profil/postari" : "map"}`}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {isAuthor
                ? t({ ro: "Postările mele", en: "My posts" })
                : t({ ro: "Harta de colectare", en: "Collection map" })}
            </Link>
            <AnimatePresence mode="wait">
              <motion.span
                key={isUnavailableNow ? "unavailable" : post.status}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.25, ease: EASE }}
                className={`text-xs font-bold px-3 py-1.5 rounded-full ${statusCfg.className}`}
              >
                {statusCfg.label}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* ── STATUS-SPECIFIC ACTION SECTION ── */}
          <AnimatePresence mode="wait">
            {/* OPEN (author) */}
            {post.status === "OPEN" && isAuthor && (
              <motion.div
                key="open-author"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="mb-7 space-y-3"
              >
                <p className="text-sm text-slate-600 leading-relaxed">
                  {isUnavailableNow
                    ? t({
                        ro: "Anunțul tău se află în afara intervalului de disponibilitate și nu este vizibil colectorilor în acest moment.",
                        en: "Your listing is outside its availability window and isn't visible to collectors right now.",
                      })
                    : t({
                        ro: "Anunțul tău este vizibil pe hartă. Vei fi notificat imediat ce un colector face o cerere.",
                        en: "Your listing is visible on the map. You'll be notified as soon as a collector makes a request.",
                      })}
                </p>
                <motion.button
                  onClick={() => setShowCancel(true)}
                  disabled={actionLoading}
                  whileTap={{ scale: 0.97 }}
                  className="text-sm text-red-400 hover:text-red-600 font-medium transition-colors cursor-pointer disabled:opacity-40"
                >
                  {t({ ro: "Anulează anunțul", en: "Cancel listing" })}
                </motion.button>
                <div className="h-px bg-slate-100 mt-4" />
              </motion.div>
            )}

            {/* CLAIMED (author) — one card per pending collect request */}
            {post.status === "CLAIMED" &&
              isAuthor &&
              (post.claimRequests?.length ?? 0) > 0 && (
                <motion.div
                  key="claimed-author"
                  variants={sectionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="mb-7 space-y-4"
                >
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {(post.claimRequests?.length ?? 0) === 1
                      ? t({
                          ro: "Un colector vrea să îți preia sticlele. Odată aprobat, va avea 60 min la dispoziție să ajungă.",
                          en: "A collector wants to pick up your bottles. Once approved, they'll have 60 minutes to arrive.",
                        })
                      : t({
                          ro: `${post.claimRequests?.length} colectori vor să îți preia sticlele. Odată aprobat, colectorul ales va avea 60 min la dispoziție să ajungă.`,
                          en: `${post.claimRequests?.length} collectors want to pick up your bottles. Once approved, the chosen collector will have 60 minutes to arrive.`,
                        })}
                  </p>

                  {post.claimRequests?.map((request, i) => {
                    const collector = request.collector;
                    const busy =
                      actionLoading && actionCollectorId === collector.id;
                    return (
                      <motion.div
                        key={collector.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 0.08 + i * 0.06,
                          duration: 0.35,
                          ease: EASE,
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <UserHoverCard userId={collector.id}>
                            <Link
                              href={`/user/${collector.id}`}
                              className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 hover:ring-2 hover:ring-lime-400 hover:ring-offset-1 transition-all"
                            >
                              {collector.image ? (
                                <Image
                                  src={collector.image}
                                  alt={collector.name ?? ""}
                                  width={44}
                                  height={44}
                                  priority
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <span className="text-sm font-bold text-slate-500">
                                  {collector.name?.[0] ?? "?"}
                                </span>
                              )}
                            </Link>
                          </UserHoverCard>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <UserHoverCard userId={collector.id}>
                                <Link
                                  href={`/user/${collector.id}`}
                                  className="text-sm font-bold text-slate-900 truncate hover:text-lime-700 transition-colors flex items-center gap-0.5"
                                >
                                  {collector.name ??
                                    t({ ro: "Colector", en: "Collector" })}
                                  {collector.certified && (
                                    <VerifiedBadge className="w-4 h-4 shrink-0" />
                                  )}
                                </Link>
                              </UserHoverCard>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Star className="w-3 h-3 text-[#FFDF00] fill-[#FFDF00]" />
                                <span className="text-xs text-slate-500">
                                  {(collector.reputationScore ?? 0).toFixed(1)}{" "}
                                  <span className="text-slate-400">
                                    ({collector.ratingCount ?? 0})
                                  </span>
                                </span>
                              </div>
                            </div>
                            {request.createdAt && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                {t({
                                  ro: "Cerere trimisă la ",
                                  en: "Requested at ",
                                })}
                                {new Date(request.createdAt).toLocaleTimeString(
                                  locale === "ro" ? "ro-RO" : "en-GB",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <motion.button
                            onClick={() => handleApprove("deny", collector.id)}
                            disabled={actionLoading}
                            whileTap={{ scale: 0.96 }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-40 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />{" "}
                            {t({ ro: "Refuză", en: "Decline" })}
                          </motion.button>
                          <motion.button
                            onClick={() =>
                              handleApprove("approve", collector.id)
                            }
                            disabled={actionLoading}
                            whileTap={{ scale: 0.96 }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#123424] text-white font-bold text-sm hover:bg-[#1a4d36] transition-all disabled:opacity-40 cursor-pointer shadow-sm"
                          >
                            {busy ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                {t({ ro: "Aprobă", en: "Approve" })}
                              </>
                            )}
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}

                  <AnimatePresence>
                    {actionError && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-sm text-red-500 font-medium overflow-hidden"
                      >
                        {actionError}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.button
                    onClick={() => setShowCancel(true)}
                    disabled={actionLoading}
                    whileTap={{ scale: 0.97 }}
                    className="text-sm text-red-400 hover:text-red-600 font-medium transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {t({ ro: "Anulează anunțul", en: "Cancel listing" })}
                  </motion.button>
                  <div className="h-px bg-slate-100 mt-2" />
                </motion.div>
              )}

            {/* CLAIMED (requester) — my pending collect request */}
            {post.status === "CLAIMED" && isCollectorPending && (
              <motion.div
                key="claimed-collector"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="mb-7 space-y-3"
              >
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.3, ease: EASE }}
                  className="flex items-center gap-3"
                >
                  <Image
                    src="/images/claimed-clock.svg"
                    alt="Claimed Clock"
                    width={40}
                    height={40}
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {t({
                        ro: "Cererea ta a fost trimisă",
                        en: "Your request has been sent",
                      })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t({
                        ro: "Se așteaptă aprobarea autorului…",
                        en: "Waiting for the author's approval…",
                      })}
                    </p>
                  </div>
                </motion.div>
                <AnimatePresence initial={false}>
                  {(post.pendingRequestCount ?? 0) > 1 &&
                    (() => {
                      const others = (post.pendingRequestCount ?? 1) - 1;
                      return (
                        <motion.div
                          key="others-count"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.28, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <div className="w-fit flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-xl pr-4 pl-3 py-2">
                            <Users className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            {others === 1
                              ? t({
                                  ro: "Încă o persoană vrea să colecteze sticlele!",
                                  en: "One more person wants to collect the bottles!",
                                })
                              : t({
                                  ro: `Încă ${others} persoane vor să colecteze sticlele!`,
                                  en: `${others} more people want to collect the bottles!`,
                                })}
                          </div>
                        </motion.div>
                      );
                    })()}
                </AnimatePresence>
                <AnimatePresence>
                  {actionError && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-sm text-red-500 font-medium overflow-hidden"
                    >
                      {actionError}
                    </motion.p>
                  )}
                </AnimatePresence>
                <button
                  onClick={handleWithdraw}
                  disabled={actionLoading}
                  className="text-sm text-red-400 hover:text-red-600 font-medium transition-colors cursor-pointer disabled:opacity-40"
                >
                  {actionLoading
                    ? t({ ro: "Se retrage…", en: "Withdrawing…" })
                    : t({ ro: "Retrage cererea", en: "Withdraw request" })}
                </button>
                <div className="h-px bg-slate-100 mt-2" />
              </motion.div>
            )}

            {/* My request was declined by the author */}
            {(post.status === "CLAIMED" || post.status === "OPEN") &&
              post.myRequest?.status === "DECLINED" && (
                <motion.div
                  key="request-declined"
                  variants={sectionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="mb-7 space-y-3"
                >
                  <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                    <XCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-600">
                      {t({
                        ro: "Autorul a refuzat cererea ta pentru acest anunț.",
                        en: "The author declined your request for this listing.",
                      })}
                    </p>
                  </div>
                  <div className="h-px bg-slate-100 mt-2" />
                </motion.div>
              )}

            {/* IN_PROGRESS */}
            {post.status === "IN_PROGRESS" && (isAuthor || isCollector) && (
              <motion.div
                key="in-progress"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="mb-7 space-y-5"
              >
                <div className="bg-slate-50 border border-[#123424]/10 rounded-2xl p-5 space-y-5">
                  {post.expiresAt && (
                    <Countdown
                      deadline={post.expiresAt}
                      onEnd={() => setTimeout(() => mutate(), 1500)}
                    />
                  )}

                  <div className="border-t border-[#123424]/10 pt-4">
                    <p className="text-sm font-medium text-[#123424] mb-3">
                      {isAuthor
                        ? t({
                            ro: "Codul tău de confirmare",
                            en: "Your confirmation code",
                          })
                        : t({
                            ro: "Introdu codul de confirmare",
                            en: "Enter the confirmation code",
                          })}
                    </p>

                    <AnimatePresence mode="wait">
                      {isAuthor ? (
                        showCode ? (
                          <motion.div
                            key="code-visible"
                            variants={sectionVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                          >
                            <CodeDisplay postId={post.id} />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="code-hidden"
                            variants={sectionVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                          >
                            <motion.button
                              onClick={() => setShowCode(true)}
                              whileTap={{ scale: 0.97 }}
                              className="w-full flex items-center justify-center py-3.5 rounded-xl bg-[#123424] text-white font-bold text-sm hover:bg-[#1a4d36] transition-all cursor-pointer"
                            >
                              {t({ ro: "Afișează codul", en: "Show code" })}
                              <LockKeyholeOpen className="w-4 h-4 ml-2" />
                            </motion.button>
                          </motion.div>
                        )
                      ) : (
                        <motion.div
                          key="code-entry"
                          variants={sectionVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                        >
                          <CodeEntry
                            postId={post.id}
                            onSuccess={() => setCodeConfirmHold(true)}
                            onComplete={() => {
                              setCodeConfirmHold(false);
                              setActiveCounts({
                                activeCollections: 0,
                                activeCollectionId: null,
                              });
                              mutate();
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence>
                    {actionError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-[#123424]/10 pt-4 overflow-hidden"
                      >
                        <p className="text-sm text-red-500 font-medium">
                          {actionError}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="border-t border-[#123424]/10 pt-4">
                    <button
                      onClick={() => setShowCancel(true)}
                      disabled={actionLoading}
                      className="text-sm text-red-400 hover:text-red-600 font-medium transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {isAuthor
                        ? t({
                            ro: "Anulează colectarea",
                            en: "Cancel collection",
                          })
                        : t({
                            ro: "Renunță la colectare",
                            en: "Give up collection",
                          })}
                    </button>
                  </div>
                </div>
                <div className="h-px bg-slate-100 mb-7 mt-7" />
              </motion.div>
            )}

            {/* COMPLETED */}
            {post.status === "COMPLETED" &&
              post.transaction &&
              (isAuthor || isCollector) && (
                <motion.div
                  key="completed"
                  variants={sectionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="mb-7 space-y-5"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.35, ease: EASE }}
                    className="bg-lime-50 border border-lime-200 rounded-2xl p-4 space-y-2.5"
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15, duration: 0.3 }}
                      className="flex items-center gap-2 mb-3"
                    >
                      <CheckCircle className="w-4 h-4 text-lime-600" />
                      <span className="text-sm font-bold text-lime-800">
                        {t({
                          ro: "Tranzacție finalizată",
                          en: "Transaction completed",
                        })}
                      </span>
                      <span className="text-xs text-lime-500 ml-auto">
                        {new Date(
                          post.transaction.completedAt,
                        ).toLocaleDateString(
                          locale === "ro" ? "ro-RO" : "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </span>
                    </motion.div>
                    {[
                      [
                        t({ ro: "Sticle colectate", en: "Bottles collected" }),
                        `${Math.round(post.transaction.actualValue / 0.5)} ${t({ ro: "buc", en: "pcs" })}`,
                      ],
                      [
                        t({ ro: "Valoare totală", en: "Total value" }),
                        fmt(post.transaction.actualValue),
                      ],
                      [
                        t({ ro: "Câștigul tău", en: "Your earnings" }),
                        fmt(myActualEarning ?? 0, { sign: true }),
                      ],
                    ].map(([label, value], i) => (
                      <motion.div
                        key={label}
                        custom={i}
                        variants={slideUpVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex justify-between text-sm"
                      >
                        <span className="text-slate-500">{label}</span>
                        <span
                          className={`font-bold ${i === 2 ? "text-lime-700" : "text-slate-800"}`}
                        >
                          {value}
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>

                  <div className="space-y-4">
                    <AnimatePresence>
                      {ratingIReceived && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            delay: 0.2,
                            duration: 0.35,
                            ease: EASE,
                          }}
                          className="bg-white border border-slate-100 rounded-2xl p-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-600">
                                {t({
                                  ro: "Rating-ul primit de la",
                                  en: "Rating received from",
                                })}{" "}
                                <span className="font-semibold text-slate-800">
                                  {targetName}
                                </span>
                              </span>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <motion.svg
                                    key={i}
                                    initial={{ scale: 0, rotate: -20 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{
                                      delay: 0.25 + i * 0.05,
                                      type: "spring",
                                      stiffness: 400,
                                      damping: 20,
                                    }}
                                    className="w-4 h-4"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fill={
                                        i <= ratingIReceived
                                          ? "#FFDF00"
                                          : "#e2e8f0"
                                      }
                                      d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                                    />
                                  </motion.svg>
                                ))}
                              </div>
                            </div>
                            <AnimatePresence>
                              {reviewIReceived && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="overflow-hidden"
                                >
                                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 italic text-slate-700 text-sm">
                                    &quot;{reviewIReceived}&quot;
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Review form / sent state */}
                    <div className="relative">
                      <AnimatePresence mode="wait">
                        {!ratingIGave && !justReviewed ? (
                          <motion.div
                            key="review-form"
                            variants={sectionVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                          >
                            <ReviewForm
                              postId={post.id}
                              targetName={targetName}
                              alreadyReviewed={false}
                              onDone={handleReviewDone}
                            />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="review-sent"
                            variants={sectionVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="bg-white border border-slate-100 rounded-2xl p-4"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">
                                  {t({
                                    ro: "Rating-ul tău pentru",
                                    en: "Your rating for",
                                  })}{" "}
                                  <span className="font-semibold text-slate-800">
                                    {targetName}
                                  </span>
                                </span>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((i) => (
                                    <svg
                                      key={i}
                                      className="w-4 h-4"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fill={
                                          i <= (ratingIGave || 0)
                                            ? "#FFDF00"
                                            : "#e2e8f0"
                                        }
                                        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                                      />
                                    </svg>
                                  ))}
                                </div>
                              </div>
                              <AnimatePresence>
                                {reviewIGave && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 italic text-slate-700 text-sm">
                                      &quot;{reviewIGave}&quot;
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              <AnimatePresence>
                                {justReviewed && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{
                                      type: "spring",
                                      stiffness: 400,
                                      damping: 22,
                                    }}
                                    className="flex items-center gap-2 text-[11px] text-lime-600 font-medium bg-lime-50 w-fit px-2 py-1 rounded-lg"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    {t({
                                      ro: "Feedback trimis cu succes",
                                      en: "Feedback sent successfully",
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 my-7" />
                </motion.div>
              )}

            {/* Public reviews — visible to non-participants */}
            {post.status === "COMPLETED" &&
              post.transaction &&
              !isAuthor &&
              !isCollector && (
                <motion.div
                  key="public-reviews"
                  variants={sectionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="mb-7 space-y-3"
                >
                  {(post.transaction.posterRating ||
                    post.transaction.collectorRating) && (
                    <>
                      {post.transaction.collectorRating && (
                        <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">
                              {t({ ro: "Rating-ul lui", en: "Rating for" })}{" "}
                              <span className="font-semibold text-slate-800">
                                {post.author.name ??
                                  t({ ro: "Autor", en: "Author" })}
                              </span>
                            </span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <svg
                                  key={i}
                                  className="w-4 h-4"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fill={
                                      i <= post.transaction!.collectorRating!
                                        ? "#FFDF00"
                                        : "#e2e8f0"
                                    }
                                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                                  />
                                </svg>
                              ))}
                            </div>
                          </div>
                          {post.transaction.collectorReview && (
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 italic text-slate-700 text-sm">
                              &quot;{post.transaction.collectorReview}&quot;
                            </div>
                          )}
                        </div>
                      )}
                      {post.transaction.posterRating && (
                        <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">
                              {t({ ro: "Rating-ul lui", en: "Rating for" })}{" "}
                              <span className="font-semibold text-slate-800">
                                {post.collector?.name ??
                                  t({ ro: "Colector", en: "Collector" })}
                              </span>
                            </span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <svg
                                  key={i}
                                  className="w-4 h-4"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fill={
                                      i <= post.transaction!.posterRating!
                                        ? "#FFDF00"
                                        : "#e2e8f0"
                                    }
                                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                                  />
                                </svg>
                              ))}
                            </div>
                          </div>
                          {post.transaction.posterReview && (
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 italic text-slate-700 text-sm">
                              &quot;{post.transaction.posterReview}&quot;
                            </div>
                          )}
                        </div>
                      )}
                      <div className="h-px bg-slate-100 my-7" />
                    </>
                  )}
                </motion.div>
              )}
          </AnimatePresence>

          {/* ── POST INFO ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE, delay: 0.08 }}
            className="mb-7"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
              <div className="flex items-baseline gap-2">
                <h1 className="text-4xl font-black text-[#123424] tracking-tight tabular-nums leading-none">
                  {post.bottleCount}
                </h1>
                <span className="text-lg text-slate-400">
                  {t({ ro: "sticle", en: "bottles" })}
                </span>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-lime-700 tabular-nums leading-none">
                  {renderFormattedPrice(post.bottleCount * 0.5, fmt, {
                    makeSignBigger: true,
                  })}
                </span>
              </div>
            </div>
            {post.locationName && (
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span className="text-sm">{post.locationName}</span>
              </div>
            )}

            <div className="h-px bg-slate-100 my-7" />

            {post.description && (
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {post.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />{" "}
                {t({ ro: "Publicat în", en: "Posted on" })}{" "}
                {new Date(post.createdAt).toLocaleDateString(
                  locale === "ro" ? "ro-RO" : "en-GB",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  },
                )}
              </span>
              {(post.status === "OPEN" || post.status === "CLAIMED") &&
                post.expiresAt && (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3 h-3" />
                    <ExpiryText expiresAt={post.expiresAt} />
                  </div>
                )}
              {post.completedAt && (
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-lime-400" />
                  {t({ ro: "Finalizat în", en: "Completed on" })}{" "}
                  {new Date(post.completedAt).toLocaleDateString(
                    locale === "ro" ? "ro-RO" : "en-GB",
                    {
                      day: "numeric",
                      month: "short",
                    },
                  )}
                </span>
              )}
            </div>

            {schedule?.length ? (
              <div className="flex flex-wrap gap-2 mt-4">
                {schedule
                  .slice()
                  .sort(
                    (a, b) =>
                      [1, 2, 3, 4, 5, 6, 0].indexOf(a.day) -
                      [1, 2, 3, 4, 5, 6, 0].indexOf(b.day),
                  )
                  .map((s) => {
                    const d = [
                      { v: 1, s: t({ ro: "Lun", en: "Mon" }) },
                      { v: 2, s: t({ ro: "Mar", en: "Tue" }) },
                      { v: 3, s: t({ ro: "Mie", en: "Wed" }) },
                      { v: 4, s: t({ ro: "Joi", en: "Thu" }) },
                      { v: 5, s: t({ ro: "Vin", en: "Fri" }) },
                      { v: 6, s: t({ ro: "Sâm", en: "Sat" }) },
                      { v: 0, s: t({ ro: "Dum", en: "Sun" }) },
                    ].find((x) => x.v === s.day);
                    return (
                      <span
                        key={s.day}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700"
                      >
                        <span className="text-slate-400">{d?.s}</span>
                        {s.start}–{s.end}
                      </span>
                    );
                  })}
              </div>
            ) : null}
          </motion.div>

          {/* Collect CTA for non-participants on OPEN or CLAIMED posts —
              several collectors can request the same post, so pending
              requests from others don't block a new one. */}
          <AnimatePresence initial={false}>
            {(post.status === "OPEN" || post.status === "CLAIMED") &&
            !isAuthor &&
            !isCollector &&
            !isCollectorPending &&
            post.myRequest?.status !== "DECLINED" ? (
              <motion.div
                key="collect-cta"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.28, ease: EASE }}
                className="overflow-hidden"
              >
                {post.status === "CLAIMED" &&
                  (post.pendingRequestCount ?? 0) > 0 && (
                    <div className="flex items-center gap-2 mb-3 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      {(post.pendingRequestCount ?? 0) === 1
                        ? t({
                            ro: "Un colector a trimis deja o cerere — poți trimite și tu una.",
                            en: "One collector already sent a request — you can still send yours.",
                          })
                        : t({
                            ro: `${post.pendingRequestCount} colectori au trimis deja cereri — poți trimite și tu una.`,
                            en: `${post.pendingRequestCount} collectors already sent requests — you can still send yours.`,
                          })}
                    </div>
                  )}
                <AnimatePresence>
                  {claimError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-4"
                    >
                      <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                        <span className="text-xs font-semibold text-red-600">
                          {claimError}
                        </span>
                        <button
                          onClick={() => setClaimError(null)}
                          className="text-red-400 hover:text-red-600 ml-2"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.button
                  onClick={isUnavailableNow ? undefined : handleClaimClick}
                  disabled={isUnavailableNow}
                  whileTap={isUnavailableNow ? {} : { scale: 0.97 }}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all mb-7 ${
                    isUnavailableNow
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : "bg-[#123424] text-white hover:bg-[#1a4d36] cursor-pointer"
                  }`}
                >
                  {isUnavailableNow ? (
                    <>
                      <TbCancel className="w-4 h-4" />
                      {t({
                        ro: "Indisponibil momentan",
                        en: "Currently unavailable",
                      })}
                    </>
                  ) : (
                    <>
                      <FaWineBottle className="w-4 h-4 text-lime-400" />
                      {isLoggedIn
                        ? t({
                            ro: "Colectează sticlele",
                            en: "Collect the bottles",
                          })
                        : t({
                            ro: "Conectează-te și colectează!",
                            en: "Sign in and collect!",
                          })}
                    </>
                  )}
                </motion.button>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="h-px bg-slate-100 mb-7" />

          {/* ── EARNINGS SPLIT ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE, delay: 0.12 }}
            className="mb-7"
          >
            {(() => {
              const getPercentColor = (pct: number) =>
                pct >= 67
                  ? { bar: "bg-lime-400", text: "text-lime-600" }
                  : pct >= 34
                    ? { bar: "bg-lime-600", text: "text-lime-600" }
                    : { bar: "bg-lime-700", text: "text-lime-700" };

              const viewAsCollector = !isAuthor;
              const myPct = isAuthor ? posterPct : post.collectorSharePercent;
              const isTerminated =
                post.status === "EXPIRED" || post.status === "CANCELLED";
              const { bar: rawBarColor, text: rawEarningColor } =
                getPercentColor(myPct);
              const myBarColor = isTerminated ? "bg-slate-400" : rawBarColor;
              const earningColor = isTerminated
                ? "text-slate-400"
                : rawEarningColor;

              const posterBarColor = isAuthor ? myBarColor : "bg-slate-200";
              const collectorBarColor = viewAsCollector
                ? myBarColor
                : "bg-slate-200";

              const isNonParticipant = !isAuthor && !isCollector;

              const myLabel = isNonParticipant
                ? post.status === "COMPLETED"
                  ? t({
                      ro: "Colectorul a câștigat",
                      en: "The collector earned",
                    })
                  : isTerminated
                    ? t({
                        ro: "Colectorul ar fi câștigat",
                        en: "The collector would have earned",
                      })
                    : t({
                        ro: "Colectorul câștigă",
                        en: "The collector earns",
                      })
                : isAuthor
                  ? post.status === "COMPLETED"
                    ? t({ ro: "ai primit", en: "you received" })
                    : isTerminated
                      ? t({ ro: "Ai fi primit", en: "You would have received" })
                      : t({ ro: "Primești", en: "You receive" })
                  : post.status === "COMPLETED"
                    ? t({ ro: "Ai câștigat", en: "You earned" })
                    : isTerminated
                      ? t({ ro: "Ai fi câștigat", en: "You would have earned" })
                      : t({ ro: "Câștigi", en: "You earn" });

              const displayEarning =
                post.status === "COMPLETED" &&
                myActualEarning !== null &&
                !isNonParticipant
                  ? myActualEarning
                  : isNonParticipant || !isAuthor
                    ? collectorEarning
                    : posterEarning;

              return (
                <>
                  <div className="flex items-center gap-1 sm:gap-2 mb-1">
                    {!isNonParticipant &&
                      viewAsCollector &&
                      post.status !== "COMPLETED" &&
                      post.status !== "CANCELLED" &&
                      post.status !== "EXPIRED" && (
                        <>
                          <span className="text-xs sm:text-sm text-slate-500 mr-1 sm:mr-0">
                            {t({ ro: "Plătești", en: "You pay" })}
                          </span>
                          <span className="text-2xl font-black leading-none text-slate-500">
                            {renderFormattedPrice(posterEarning, fmt)}
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mx-1 sm:mx-0" />
                        </>
                      )}
                    <span className="text-xs sm:text-sm text-slate-500 mr-1 sm:mr-0">
                      {myLabel}
                    </span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`${displayEarning}-${post.status}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.25 }}
                        className={`text-2xl font-black leading-none ${earningColor}`}
                      >
                        {!isNonParticipant &&
                        viewAsCollector &&
                        post.status !== "COMPLETED" &&
                        post.status !== "CANCELLED" &&
                        post.status !== "EXPIRED"
                          ? renderFormattedPrice(post.estimatedValue, fmt)
                          : renderFormattedPrice(displayEarning, (val) =>
                              fmt(val, { sign: true }),
                            )}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <div className="mt-3 h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <motion.div
                      className={`h-full rounded-l-full ${posterBarColor}`}
                      initial={{ opacity: 0, scaleX: 0.85 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
                      style={{
                        width: `${posterPct}%`,
                        transformOrigin: "left center",
                      }}
                    />
                    <motion.div
                      className={`h-full rounded-r-full ${collectorBarColor}`}
                      initial={{ opacity: 0, scaleX: 0.85 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ duration: 0.5, ease: EASE, delay: 0.25 }}
                      style={{
                        width: `${post.collectorSharePercent}%`,
                        transformOrigin: "right center",
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>
                      {t({ ro: "Autorul", en: "Author" })} {posterPct}% (
                      {fmt(posterEarning)})
                    </span>
                    <span>
                      {t({ ro: "Colectorul", en: "Collector" })}{" "}
                      {post.collectorSharePercent}% ({fmt(collectorEarning)})
                    </span>
                  </div>
                </>
              );
            })()}
          </motion.div>

          <div className="h-px bg-slate-100 mb-7" />

          {/* ── PARTICIPANTS ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE, delay: 0.15 }}
            className="space-y-4 mb-7"
          >
            <PersonRow
              user={post.author}
              role={t({ ro: "Autor", en: "Author" })}
              showPhone={isCollector && post.status === "IN_PROGRESS"}
            />
            <AnimatePresence mode="wait">
              {showCollector && post.collector ? (
                <motion.div
                  key="collector-row"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <PersonRow
                    user={post.collector}
                    role={t({ ro: "Colector", en: "Collector" })}
                    showPhone={isAuthor && post.status === "IN_PROGRESS"}
                  />
                </motion.div>
              ) : post.status === "OPEN" ? (
                <motion.div
                  key="waiting-collector"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-3"
                >
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      ease: "easeInOut",
                    }}
                    className="w-10 h-10 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center"
                  >
                    <span className="text-slate-300 text-base">?</span>
                  </motion.div>
                  <span className="text-sm text-slate-400">
                    {t({
                      ro: "Se așteaptă un colector...",
                      en: "Waiting for a collector...",
                    })}
                  </span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>

          <div className="h-px bg-slate-100 mb-7" />

          {/* ── NAVIGATION ── */}
          <div className="mb-4">
            {showExactLocation && (
              <NavButtons
                lat={post.latitude}
                lng={post.longitude}
                showExact={showExactLocation}
              />
            )}
          </div>
        </div>

        <AnimatePresence>
          {showCancel && (
            <CancelModal
              onConfirm={handleCancel}
              onClose={() => setShowCancel(false)}
              isInProgress={post.status === "IN_PROGRESS"}
            />
          )}
        </AnimatePresence>
      </div>

      {chatVisible && (
        <>
          <ChatTriggerButton
            isOpen={chatOpen}
            unread={chatUnread}
            partnerName={
              isAuthor ? (post.collector?.name ?? null) : post.author.name
            }
            partnerImage={
              isAuthor ? (post.collector?.image ?? null) : post.author.image
            }
            onClick={() => setChatOpen(true)}
            readOnly={chatReadOnly}
          />
          <PostChat
            postId={post.id}
            userId={userId}
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
            isParticipant
            partnerName={
              isAuthor ? (post.collector?.name ?? null) : post.author.name
            }
            partnerImage={
              isAuthor ? (post.collector?.image ?? null) : post.author.image
            }
            partnerRole={
              isAuthor
                ? t({ ro: "Colectorul sticlelor", en: "Bottle collector" })
                : t({ ro: "Autorul anunțului", en: "Listing author" })
            }
            readOnly={chatReadOnly}
          />
        </>
      )}

      {isAuthor && (post.status === "OPEN" || post.status === "CLAIMED") && (
        <EmailOptinPopup context="author" postId={post.id} />
      )}

      {isCollectorPending && post.status === "CLAIMED" && (
        <EmailOptinPopup context="collector" postId={post.id} />
      )}

      <CollectConfirmModal
        isOpen={showClaimModal}
        onConfirm={handleClaimConfirmed}
        onCancel={() => setShowClaimModal(false)}
        post={post}
        loading={claiming}
      />
    </div>
  );
}

export default function PostDetailClient({
  postId,
  userId,
}: {
  postId: string;
  userId: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { post, mutate, isLoading } = usePostLive(postId);
  const { on, off } = useRecashSocket();

  useEffect(() => {
    const handleCancelled = (payload: {
      postId: string;
      cancelledBy: string;
      newStatus: string;
      reason?: string;
    }) => {
      if (payload.postId !== postId) return;
      if (payload.reason === "claim_denied") {
        router.push("/map");
      }
    };
    on("post:cancelled", handleCancelled);
    return () => off("post:cancelled", handleCancelled);
  }, [on, off, postId, router]);

  if (isLoading) return <Skeleton />;

  if (!post) {
    return (
      <div className="flex flex-col items-center">
        <FaWineBottle className="w-10 h-10 text-slate-300" />
        <p className="text-slate-500 font-medium">
          {t({ ro: "Anunțul nu a fost găsit.", en: "Listing not found." })}
        </p>
        <Link href="/map">{t({ ro: "Hartă", en: "Map" })}</Link>
      </div>
    );
  }

  const isAuthor = post.isAuthor ?? post.author?.id === userId;
  const isCollector = post.isCollector ?? post.collector?.id === userId;
  const showExactLocation =
    isAuthor ||
    (!!isCollector &&
      (post.status === "IN_PROGRESS" || post.status === "COMPLETED"));
  const isCollectorPending =
    post.myRequest?.status === "PENDING" && post.status === "CLAIMED";
  const handleRedirect = (url: string) => router.push(url);

  return (
    <>
      <div className="lg:hidden flex flex-col min-h-[calc(100vh-var(--header-height))]">
        <div className="relative h-[260px] w-full shrink-0">
          <PostMap
            key={`${showExactLocation}-${post.status}`}
            lat={post.latitude}
            lng={post.longitude}
            locationName={post.locationName}
            showExact={showExactLocation}
          />
          <MapQuickNav
            lat={post.latitude}
            lng={post.longitude}
            showExact={showExactLocation}
            isCollectorPending={isCollectorPending}
            status={post.status}
          />
        </div>
        <div className="flex-1 bg-white w-full">
          <DetailPanel
            post={post}
            userId={userId}
            isAuthor={!!isAuthor}
            isCollector={!!isCollector}
            mutate={mutate}
            onRedirect={handleRedirect}
            showExactLocation={showExactLocation}
            isCollectorPending={isCollectorPending}
          />
        </div>
      </div>

      <div
        className="hidden lg:flex"
        style={{ height: "calc(100vh - var(--header-height))" }}
      >
        <div className="w-[55%] relative shrink-0">
          <PostMap
            key={`${showExactLocation}-${post.status}`}
            lat={post.latitude}
            lng={post.longitude}
            locationName={post.locationName}
            showExact={showExactLocation}
          />
          <MapQuickNav
            lat={post.latitude}
            lng={post.longitude}
            showExact={showExactLocation}
            isCollectorPending={isCollectorPending}
            status={post.status}
          />
        </div>
        <div className="flex-1 bg-white border-l border-slate-100 overflow-hidden">
          <DetailPanel
            post={post}
            userId={userId}
            isAuthor={!!isAuthor}
            isCollector={!!isCollector}
            mutate={mutate}
            onRedirect={handleRedirect}
            showExactLocation={showExactLocation}
            isCollectorPending={isCollectorPending}
          />
        </div>
      </div>
    </>
  );
}
