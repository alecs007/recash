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
} from "lucide-react";
import { FaWineBottle } from "react-icons/fa";
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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_CONFIG: Record<PostStatus, { label: string; className: string }> =
  {
    OPEN: { label: "Disponibil", className: "bg-emerald-100 text-emerald-700" },
    CLAIMED: {
      label: "Cerere în așteptare",
      className: "bg-blue-100 text-blue-700",
    },
    IN_PROGRESS: {
      label: "Colectare în desfăşurare",
      className: "bg-amber-100 text-amber-700",
    },
    COMPLETED: { label: "Finalizat", className: "bg-lime-100 text-lime-700" },
    CANCELLED: { label: "Anulat", className: "bg-red-100 text-red-600" },
    EXPIRED: { label: "Expirat", className: "bg-slate-100 text-slate-500" },
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

function MapQuickNav({ lat, lng }: { lat: number; lng: number }) {
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
}: {
  lat: number;
  lng: number;
  locationName: string | null;
}) {
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
    const map = L.map(ref.current, {
      center: [lat, lng],
      zoom: 15,
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
    L.marker([lat, lng], { icon })
      .addTo(map)
      .bindPopup(`<strong>${locationName ?? "Locația sticlelor"}</strong>`);
    mapRef.current = map;
    return () => {
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

function Countdown({ deadline }: { deadline: string }) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const tick = () =>
      setMs(Math.max(0, new Date(deadline).getTime() - Date.now()));
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
          {expired ? "Timp expirat" : urgent ? "Grăbește-te!" : "Timp rămas"}
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
        <p className="text-sm text-red-500 mb-2">Nu s-a putut obține codul.</p>
        <button
          onClick={() => mutate()}
          className="flex items-center gap-1 mx-auto text-xs text-slate-500 hover:text-slate-700"
        >
          <RefreshCw className="w-3 h-3" /> Reîncearcă
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
        Arată acest cod colectorului când ajunge la tine
      </p>
    </motion.div>
  );
}

function CodeEntry({
  postId,
  onComplete,
}: {
  postId: string;
  onComplete: () => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    const c = code.trim().toUpperCase();
    if (c.length !== 4) {
      setError("Introdu codul de 4 caractere.");
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
        setError(j.error ?? "Eroare");
        setLoading(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => onComplete(), 600);
    } catch {
      setError("Eroare de rețea.");
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
            <span className="font-bold text-lime-700">Cod confirmat!</span>
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
                    Confirmă colectarea
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
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  if (alreadyReviewed || done) return;
  const submit = async () => {
    if (!rating) {
      setError("Alege un rating");
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
        setError(j.error ?? "Eroare");
        setLoading(false);
        return;
      }
      setDone(true);
      onDone();
    } catch {
      setError("Eroare de rețea.");
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
        Cum a decurs experiența cu <strong>{targetName}</strong>?
      </p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <motion.button
            key={s}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            whileTap={{ scale: 1.2 }}
            className="cursor-pointer"
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
        placeholder="Lasă un comentariu (opțional)..."
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
        {loading ? "Se trimite..." : "Trimite rating"}
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
            Ești sigur că vrei să anulezi?
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
                Anularea în timp ce colectarea este activă îți va afecta scorul
                de reputație.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm cursor-pointer hover:border-slate-300 transition-all"
          >
            Înapoi
          </button>
          <motion.button
            onClick={onConfirm}
            whileTap={{ scale: 0.96 }}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm cursor-pointer hover:bg-red-600 transition-all"
          >
            Anulează
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
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="flex items-center gap-3"
    >
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
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/user/${user.id}`}
            className="text-sm font-semibold text-slate-900 hover:text-lime-700 transition-colors truncate flex items-center gap-0.5"
          >
            {user.name ?? "Utilizator"}
            {user.certified && <VerifiedBadge className="w-4 h-4 shrink-0" />}
          </Link>
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
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!expiresAt) return;
    const calc = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setLabel("Expirat");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const d = Math.floor(h / 24);
      setLabel(
        d > 0
          ? `Expiră în ${d}z ${h % 24 > 0 ? `${h % 24}h ` : ""} ${m}min`
          : `Expiră în ${h > 0 ? `${h}h ` : ""} ${m}min`,
      );
    };
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (!label) return null;
  return <span className="text-xs text-slate-400">{label}</span>;
}

function NavButtons({ lat, lng }: { lat: number; lng: number }) {
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
  post,
  userId,
  isAuthor,
  isCollector,
  mutate,
  onRedirect,
}: {
  post: Post;
  userId: string;
  isAuthor: boolean;
  isCollector: boolean;
  mutate: () => void;
  onRedirect: (url: string) => void;
}) {
  const [showCancel, setShowCancel] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [justReviewed, setJustReviewed] = useState(false);
  const setActiveCounts = useSetActiveCounts();

  const [chatOpen, setChatOpen] = useState(false);

  const { unread: chatUnread } = usePostChat(
    post.id,
    userId,
    (isAuthor || isCollector) && post.status === "IN_PROGRESS",
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
    post.status === "OPEN" &&
    !!schedule?.length &&
    !isCurrentlyAvailable(schedule);

  const isNonParticipant = !isAuthor && !isCollector;

  const statusCfg = isUnavailableNow
    ? { label: "Indisponibil", className: "bg-orange-100 text-orange-700" }
    : post.status === "COMPLETED" && isNonParticipant
      ? { label: "Finalizat", className: "bg-slate-100 text-slate-500" }
      : STATUS_CONFIG[post.status];
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
    ? (post.collector?.name ?? "Colectorul")
    : (post.author.name ?? "Autorul");

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
        setClaimError(json.error ?? "Eroare la revendicare.");
        setClaiming(false);
        return;
      }
      setShowClaimModal(false);
      setActiveCounts({ activeCollections: 1, activeCollectionId: post.id });
      await mutate();
    } catch {
      setShowClaimModal(false);
      setClaimError("Eroare de rețea. Încearcă din nou.");
      setClaiming(false);
    }
  };

  const handleReviewDone = () => {
    setJustReviewed(true);
    mutate();
  };

  const handleApprove = useCallback(
    async (action: "approve" | "deny") => {
      setActionLoading(true);
      setActionError("");
      try {
        const res = await fetch(`/api/v1/posts/${post.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const j = await res.json();
        if (!res.ok) {
          setActionError(j.error ?? "Eroare");
        } else if (action === "deny") {
          showToast(
            "info",
            "Cerere refuzată",
            "Anunțul tău este din nou disponibil pe hartă.",
          );
          mutate();
        } else {
          showToast(
            "success",
            "Cerere aprobată!",
            "Colectorul are 30 de minute să ajungă la tine.",
          );
          mutate();
        }
      } catch {
        setActionError("Eroare de rețea.");
      } finally {
        setActionLoading(false);
      }
    },
    [post.id, mutate],
  );

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
        setActionError(j.error ?? "Eroare");
      } else {
        if (isAuthor) {
          setActiveCounts({ activePosts: 0, activePostId: null });
        } else {
          setActiveCounts({ activeCollections: 0, activeCollectionId: null });
        }
        onRedirect(post.status === "IN_PROGRESS" ? "/" : `/?toast=${toastKey}`);
      }
    } catch {
      setActionError("Eroare de rețea.");
    } finally {
      setActionLoading(false);
    }
  }, [post.id, post.status, isAuthor, onRedirect, setActiveCounts]);

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
              {isAuthor ? "Postările mele" : "Harta de colectare"}
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
                    ? "Anunțul tău se află în afara intervalului de disponibilitate și nu este vizibil colectorilor în acest moment."
                    : "Anunțul tău este vizibil pe hartă. Vei fi notificat imediat ce un colector face o cerere."}
                </p>
                <motion.button
                  onClick={() => setShowCancel(true)}
                  disabled={actionLoading}
                  whileTap={{ scale: 0.97 }}
                  className="text-sm text-red-400 hover:text-red-600 font-medium transition-colors cursor-pointer disabled:opacity-40"
                >
                  Anulează anunțul
                </motion.button>
                <div className="h-px bg-slate-100 mt-4" />
              </motion.div>
            )}

            {/* CLAIMED (author) */}
            {post.status === "CLAIMED" && isAuthor && post.collector && (
              <motion.div
                key="claimed-author"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="mb-7 space-y-4"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.35, ease: EASE }}
                  className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3"
                >
                  <Link
                    href={`/user/${post.collector.id}`}
                    className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 hover:ring-2 hover:ring-lime-400 hover:ring-offset-1 transition-all"
                  >
                    {post.collector.image ? (
                      <Image
                        src={post.collector.image}
                        alt={post.collector.name ?? ""}
                        width={44}
                        height={44}
                        priority
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-sm font-bold text-slate-500">
                        {post.collector.name?.[0] ?? "?"}
                      </span>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/user/${post.collector.id}`}
                        className="text-sm font-bold text-slate-900 truncate hover:text-lime-700 transition-colors flex items-center gap-0.5"
                      >
                        {post.collector.name ?? "Colector"}
                        {post.collector.certified && (
                          <VerifiedBadge className="w-4 h-4 shrink-0" />
                        )}
                      </Link>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-3 h-3 text-[#FFDF00] fill-[#FFDF00]" />
                        <span className="text-xs text-slate-500">
                          {post.collector.reputationScore.toFixed(1)}{" "}
                          <span className="text-slate-400">
                            ({post.collector.ratingCount})
                          </span>
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Vrea să colecteze sticlele tale. Odată aprobat, va avea 60
                      min la dispoziție să ajungă.
                    </p>
                  </div>
                </motion.div>

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

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.3, ease: EASE }}
                  className="flex gap-3"
                >
                  <motion.button
                    onClick={() => handleApprove("deny")}
                    disabled={actionLoading}
                    whileTap={{ scale: 0.96 }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" /> Refuză
                  </motion.button>
                  <motion.button
                    onClick={() => handleApprove("approve")}
                    disabled={actionLoading}
                    whileTap={{ scale: 0.96 }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#123424] text-white font-bold text-sm hover:bg-[#1a4d36] transition-all disabled:opacity-40 cursor-pointer shadow-sm"
                  >
                    <AnimatePresence mode="wait">
                      {actionLoading ? (
                        <motion.span
                          key="spin"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="check"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Aprobă
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </motion.div>

                <motion.button
                  onClick={() => setShowCancel(true)}
                  disabled={actionLoading}
                  whileTap={{ scale: 0.97 }}
                  className="text-sm text-red-400 hover:text-red-600 font-medium transition-colors cursor-pointer disabled:opacity-40"
                >
                  Anulează anunțul
                </motion.button>
                <div className="h-px bg-slate-100 mt-2" />
              </motion.div>
            )}

            {/* CLAIMED (collector) */}
            {post.status === "CLAIMED" && isCollector && (
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
                      Cererea ta a fost trimisă
                    </p>
                    <p className="text-xs text-slate-500">
                      Se așteaptă aprobarea autorului…
                    </p>
                  </div>
                </motion.div>
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
                  onClick={() => setShowCancel(true)}
                  disabled={actionLoading}
                  className="text-sm text-red-400 hover:text-red-600 font-medium transition-colors cursor-pointer disabled:opacity-40"
                >
                  Anulează cererea
                </button>
                <div className="h-px bg-slate-100 mt-2" />
              </motion.div>
            )}

            {/* IN_PROGRESS */}
            {post.status === "IN_PROGRESS" && (
              <motion.div
                key="in-progress"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="mb-7 space-y-5"
              >
                <div className="bg-slate-50 border border-[#123424]/10 rounded-2xl p-5 space-y-5">
                  {post.expiresAt && <Countdown deadline={post.expiresAt} />}

                  <div className="border-t border-[#123424]/10 pt-4">
                    <p className="text-sm font-medium text-[#123424] mb-3">
                      {isAuthor
                        ? "Codul tău de confirmare"
                        : "Introdu codul de confirmare"}
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
                              Afișează codul
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
                            onComplete={() => {
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
                        ? "Anulează colectarea"
                        : "Renunță la colectare"}
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
                        Tranzacție finalizată
                      </span>
                      <span className="text-xs text-lime-500 ml-auto">
                        {new Date(
                          post.transaction.completedAt,
                        ).toLocaleDateString("ro-RO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </motion.div>
                    {[
                      [
                        "Sticle colectate",
                        `${Math.round(post.transaction.actualValue / 0.5)} buc`,
                      ],
                      [
                        "Valoare totală",
                        `${post.transaction.actualValue.toFixed(2)} RON`,
                      ],
                      ["Câștigul tău", `+${myActualEarning?.toFixed(2)} RON`],
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
                                Rating-ul primit de la{" "}
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
                                  Rating-ul tău pentru{" "}
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
                                    Feedback trimis cu succes
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
                              Rating-ul lui{" "}
                              <span className="font-semibold text-slate-800">
                                {post.author.name ?? "Autor"}
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
                              Rating-ul lui{" "}
                              <span className="font-semibold text-slate-800">
                                {post.collector?.name ?? "Colector"}
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
                <span className="text-lg text-slate-400">sticle</span>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-lime-700 tabular-nums leading-none">
                  {(post.bottleCount * 0.5).toFixed(2)}
                </span>
                <span className="text-sm text-slate-400 uppercase tracking-wider">
                  ron
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
                <Calendar className="w-3 h-3" /> Publicat în{" "}
                {new Date(post.createdAt).toLocaleDateString("ro-RO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              {post.status === "OPEN" && post.expiresAt && (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3 h-3" />
                  <ExpiryText expiresAt={post.expiresAt} />
                </div>
              )}
              {post.completedAt && (
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-lime-400" />
                  Finalizat în{" "}
                  {new Date(post.completedAt).toLocaleDateString("ro-RO", {
                    day: "numeric",
                    month: "short",
                  })}
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
                      { v: 1, s: "Lun" },
                      { v: 2, s: "Mar" },
                      { v: 3, s: "Mie" },
                      { v: 4, s: "Joi" },
                      { v: 5, s: "Vin" },
                      { v: 6, s: "Sâm" },
                      { v: 0, s: "Dum" },
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

          {/* Collect CTA for non-participants on OPEN posts */}
          {post.status === "OPEN" && !isAuthor && !isCollector && (
            <>
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
                    Indisponibil momentan
                  </>
                ) : (
                  <>
                    <FaWineBottle className="w-4 h-4 text-lime-400" />
                    {isLoggedIn
                      ? "Colectează sticlele"
                      : "Conectează-te și colectează!"}
                  </>
                )}
              </motion.button>
            </>
          )}

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
                  ? "Colectorul a câștigat"
                  : isTerminated
                    ? "Colectorul ar fi câștigat"
                    : "Colectorul câștigă"
                : isAuthor
                  ? post.status === "COMPLETED"
                    ? "Ai primit"
                    : isTerminated
                      ? "Ai fi primit"
                      : "Primești"
                  : post.status === "COMPLETED"
                    ? "Ai câștigat"
                    : isTerminated
                      ? "Ai fi câștigat"
                      : "Câștigi";

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
                            Plătești
                          </span>
                          <span className="text-2xl font-black leading-none text-slate-500">
                            {posterEarning.toFixed(2)}
                          </span>
                          <span className="text-xs sm:text-sm text-slate-400 font-light">
                            RON
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
                          ? `${post.estimatedValue.toFixed(2)}`
                          : `${displayEarning.toFixed(2) !== "0.00" ? "+" : ""}${displayEarning.toFixed(2)}`}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-xs sm:text-sm text-slate-400 font-light">
                      RON
                    </span>
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
                      Autorul {posterPct}% ({posterEarning.toFixed(2)} RON)
                    </span>
                    <span>
                      Colectorul {post.collectorSharePercent}% (
                      {collectorEarning.toFixed(2)} RON)
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
              role="Autor"
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
                    role="Colector"
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
                    Se așteaptă un colector...
                  </span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>

          <div className="h-px bg-slate-100 mb-7" />

          {/* ── NAVIGATION ── */}
          <div className="mb-4">
            <NavButtons lat={post.latitude} lng={post.longitude} />
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

      {post.status === "IN_PROGRESS" && (isAuthor || isCollector) && (
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
              isAuthor ? "Colectorul sticlelor" : "Autorul anunțului"
            }
          />
        </>
      )}

      {isAuthor && (post.status === "OPEN" || post.status === "CLAIMED") && (
        <EmailOptinPopup context="author" postId={post.id} />
      )}

      {isCollector && post.status === "CLAIMED" && (
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
        <p className="text-slate-500 font-medium">Anunțul nu a fost găsit.</p>
        <Link href="/map">Hartă</Link>
      </div>
    );
  }

  const isAuthor = post.isAuthor ?? post.author?.id === userId;
  const isCollector = post.isCollector ?? post.collector?.id === userId;
  const handleRedirect = (url: string) => router.push(url);

  return (
    <>
      <div className="lg:hidden flex flex-col min-h-[calc(100vh-var(--header-height))]">
        <div className="relative h-[260px] w-full shrink-0">
          <PostMap
            lat={post.latitude}
            lng={post.longitude}
            locationName={post.locationName}
          />
          <MapQuickNav lat={post.latitude} lng={post.longitude} />
        </div>
        <div className="flex-1 bg-white w-full">
          <DetailPanel
            post={post}
            userId={userId}
            isAuthor={!!isAuthor}
            isCollector={!!isCollector}
            mutate={mutate}
            onRedirect={handleRedirect}
          />
        </div>
      </div>

      <div
        className="hidden lg:flex"
        style={{ height: "calc(100vh - var(--header-height))" }}
      >
        <div className="w-[55%] relative shrink-0">
          <PostMap
            lat={post.latitude}
            lng={post.longitude}
            locationName={post.locationName}
          />
          <MapQuickNav lat={post.latitude} lng={post.longitude} />
        </div>
        <div className="flex-1 bg-white border-l border-slate-100 overflow-hidden">
          <DetailPanel
            post={post}
            userId={userId}
            isAuthor={!!isAuthor}
            isCollector={!!isCollector}
            mutate={mutate}
            onRedirect={handleRedirect}
          />
        </div>
      </div>
    </>
  );
}
