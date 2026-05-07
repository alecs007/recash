"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import {
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  Phone,
  AlertTriangle,
  X,
  RefreshCw,
  Loader2,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { FaWineBottle, FaWaze } from "react-icons/fa";
import { size } from "zod";

type PostStatus =
  | "OPEN"
  | "CLAIMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

interface Post {
  id: string;
  status: PostStatus;
  description: string;
  bottleCount: number;
  estimatedValue: number;
  collectorSharePercent: number;
  latitude: number;
  longitude: number;
  locationName: string | null;
  address: string | null;
  images: string[];
  createdAt: string;
  expiresAt: string | null;
  claimedAt: string | null;
  completedAt: string | null;
  isAuthor?: boolean;
  isCollector?: boolean;
  author: {
    id: string;
    name: string | null;
    image: string | null;
    reputationScore: number;
    ratingCount: number;
    phone: string | null;
  };
  collector: {
    id: string;
    name: string | null;
    image: string | null;
    reputationScore: number;
    ratingCount: number;
    phone: string | null;
  } | null;
  transaction: {
    id: string;
    actualValue: number;
    collectorEarning: number;
    posterEarning: number;
    collectorRating: number | null;
    posterRating: number | null;
    collectorReview: string | null;
    posterReview: string | null;
    completedAt: string;
    posterRatedAt: string | null;
    collectorRatedAt: string | null;
  } | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_CONFIG: Record<PostStatus, { label: string; className: string }> =
  {
    OPEN: { label: "Disponibil", className: "bg-emerald-100 text-emerald-700" },
    CLAIMED: {
      label: "Cerere în așteptare",
      className: "bg-blue-100 text-blue-700",
    },
    IN_PROGRESS: {
      label: "Colectare activă",
      className: "bg-amber-100 text-amber-700",
    },
    COMPLETED: { label: "Finalizat", className: "bg-lime-100 text-lime-700" },
    CANCELLED: { label: "Anulat", className: "bg-red-100 text-red-600" },
    EXPIRED: { label: "Expirat", className: "bg-slate-100 text-slate-500" },
  };

// ─── Map ──────────────────────────────────────────────────────────────────────

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
  const mapRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).L) {
      setReady(true);
      return;
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
    const L = (window as any).L;
    const map = L.map(ref.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    const icon = L.divIcon({
      className: "custom-map-pin",
      html: `
    <div style="
      position: relative;
      width: 32px;
      height: 32px;
      background-color: #f73138;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 3px 5px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 14px;
        height: 14px;
        background-color: #ffffff;
        border-radius: 50%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(45deg);
      "></div>
    </div>`,
      iconSize: [32, 44], // W x H including the point
      iconAnchor: [16, 44], // Bottom-center point is the anchor
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

// ─── Countdown ────────────────────────────────────────────────────────────────

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
  const color = expired ? "#ef4444" : urgent ? "#f97316" : "#123424";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-semibold ${expired ? "text-red-500" : urgent ? "text-orange-500" : "text-slate-700"}`}
        >
          {expired ? "Timp expirat" : urgent ? "Grăbește-te!" : "Timp rămas"}
        </span>
        <span
          className={`text-3xl font-black tabular-nums tracking-tight ${expired ? "text-red-500" : urgent ? "text-orange-500" : "text-[#123424]"}`}
        >
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: color }}
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
            className="w-12 h-14 bg-slate-100 rounded-lg animate-pulse"
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
    <div className="space-y-3">
      <div className="flex gap-2 justify-center">
        {data.code.split("").map((ch: string, i: number) => (
          <div
            key={i}
            className="w-12 h-14 bg-[#123424] rounded-xl flex items-center justify-center shadow-lg"
          >
            <span className="text-xl font-black text-lime-400 font-mono">
              {ch}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 text-center">
        Arată acest cod colectorului când ajunge la tine
      </p>
    </div>
  );
}

// ─── Code Entry ───────────────────────────────────────────────────────────────

function CodeEntry({
  postId,
  onComplete,
}: {
  postId: string;
  onComplete: () => void;
}) {
  const [code, setCode] = useState("");
  const [bottles, setBottles] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
        body: JSON.stringify({
          code: c,
          actualBottleCount: bottles ? parseInt(bottles) : undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "Eroare");
        setLoading(false);
        return;
      }
      onComplete();
    } catch {
      setError("Eroare de rețea.");
      setLoading(false);
    }
  };
  return (
    <div className="space-y-4">
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
        className="w-full px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-[#123424] outline-none text-3xl font-black text-center tracking-[0.5em] text-slate-900 bg-white uppercase transition-colors"
      />
      <div>
        <label className="text-xs text-slate-500 mb-1.5 block">
          Număr real de sticle <span className="italic">(dacă diferă)</span>
        </label>
        <input
          type="number"
          value={bottles}
          onChange={(e) => setBottles(e.target.value)}
          placeholder="Lasă gol dacă e același"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#123424] outline-none text-sm bg-white transition-colors"
        />
      </div>
      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
      <button
        onClick={submit}
        disabled={loading || code.length !== 4}
        className="w-full py-3.5 rounded-xl bg-[#123424] text-white font-bold text-sm hover:bg-[#1a4d36] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CheckCircle className="w-4 h-4" />
        )}
        Confirmă colectarea
      </button>
    </div>
  );
}

// ─── Review Form ──────────────────────────────────────────────────────────────

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
  if (alreadyReviewed || done)
    return (
      <div className="flex items-center gap-2 py-1">
        <CheckCircle className="w-4 h-4 text-lime-500" />
        <span className="text-sm font-medium text-slate-600">
          Ai acordat deja un rating
        </span>
      </div>
    );
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
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Cum a decurs experiența cu <strong>{targetName}</strong>?
      </p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            className="cursor-pointer transition-transform hover:scale-110"
          >
            <Star
              className={`w-7 h-7 transition-colors ${s <= (hover || rating) ? "text-lime-400 fill-lime-400" : "text-slate-200"}`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Comentariu opțional..."
        rows={2}
        maxLength={500}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[#123424] outline-none text-sm resize-none bg-white transition-colors"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        onClick={submit}
        disabled={loading || !rating}
        className="w-full py-3 rounded-xl bg-lime-400 text-black font-bold text-sm hover:bg-lime-300 disabled:opacity-40 transition-all cursor-pointer"
      >
        {loading ? "Se trimite..." : "Trimite rating"}
      </button>
    </div>
  );
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────

function CancelModal({
  onConfirm,
  onClose,
  isAuthor,
  status,
}: {
  onConfirm: (r: string) => void;
  onClose: () => void;
  isAuthor: boolean;
  status: PostStatus;
}) {
  const [reason, setReason] = useState("");
  const msg =
    status === "IN_PROGRESS"
      ? isAuthor
        ? "Colectorul este pe drum. Ești sigur că vrei să anulezi?"
        : "Colectarea este în desfășurare. Ești sigur?"
      : status === "CLAIMED" && isAuthor
        ? "Vrei să respingi cererea? Anunțul devine din nou disponibil."
        : "Vrei să renunți la colectare?";
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <h3 className="font-bold text-slate-900">Confirmare anulare</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-slate-600" />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-4">{msg}</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motiv (opțional)..."
          rows={2}
          maxLength={200}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm resize-none outline-none mb-4"
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm cursor-pointer hover:border-slate-300 transition-all"
          >
            Înapoi
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm cursor-pointer hover:bg-red-600 transition-all"
          >
            Anulează
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Person Row ───────────────────────────────────────────────────────────────

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
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
        {user.image ? (
          <Image
            src={user.image}
            alt=""
            width={40}
            height={40}
            className="object-cover w-full h-full"
          />
        ) : (
          <span className="text-sm font-bold text-slate-500">
            {user.name?.[0] ?? "?"}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 truncate">
            {user.name ?? "Utilizator"}
          </span>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
            {role}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <Star className="w-3 h-3 text-lime-400 fill-lime-400" />
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
    </div>
  );
}

// ─── Expiry text ──────────────────────────────────────────────────────────────

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
      const d = Math.floor(h / 24);
      setLabel(d > 0 ? `Expiră în ${d}z ${h % 24}h` : `Expiră în ${h}h`);
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
          color: "#4285F4",
          url: `https://www.google.com/maps?q=${lat},${lng}`,
        },
        {
          label: "Waze",
          icon: "/images/icons/waze-icon.svg",
          color: "#FF0000",
          url: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
        },
        {
          label: "Apple Maps",
          icon: "/images/icons/apple-maps-icon.svg",
          color: "#000000",
          url: `https://maps.apple.com/?q=${lat},${lng}`,
        },
      ].map((b) => (
        <a
          key={b.label}
          href={b.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-xs font-medium text-slate-600"
        >
          <Image
            src={b.icon}
            alt={b.label}
            width={20}
            height={20}
            className="w-9 aspect-square object-contain"
          />
          {b.label}
        </a>
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div
      className="flex flex-col lg:flex-row"
      style={{ height: "calc(100vh - 64px)" }}
    >
      <div className="lg:w-[55%] h-64 lg:h-full bg-slate-100 animate-pulse" />
      <div className="flex-1 px-6 lg:px-10 py-8 space-y-6 animate-pulse">
        <div className="h-4 w-24 bg-slate-100 rounded-full" />
        <div className="space-y-2">
          <div className="h-10 w-36 bg-slate-100 rounded-xl" />
          <div className="h-4 w-48 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-px bg-slate-100" />
        <div className="space-y-3">
          <div className="h-6 w-full bg-slate-100 rounded-xl" />
          <div className="h-3 w-2/3 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-px bg-slate-100" />
        <div className="space-y-3">
          <div className="h-10 w-full bg-slate-100 rounded-xl" />
          <div className="h-10 w-full bg-slate-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  post,
  isAuthor,
  isCollector,
  mutate,
}: {
  post: Post;
  isAuthor: boolean;
  isCollector: boolean;
  mutate: () => void;
}) {
  const [showCancel, setShowCancel] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const statusCfg = STATUS_CONFIG[post.status];
  const posterPct = 100 - post.collectorSharePercent;
  const posterEarning = (post.estimatedValue * posterPct) / 100;
  const collectorEarning =
    (post.estimatedValue * post.collectorSharePercent) / 100;
  const myEarning = isAuthor ? posterEarning : collectorEarning;
  const theirEarning = isAuthor ? collectorEarning : posterEarning;
  const myLabel = isAuthor ? "Tu primești" : "Tu câștigi";
  const theirLabel = isAuthor ? "Colectorul primește" : "Autorul primește";
  const myActualEarning = post.transaction
    ? isAuthor
      ? post.transaction.posterEarning
      : post.transaction.collectorEarning
    : null;
  const targetName = isAuthor
    ? (post.collector?.name ?? "Colectorul")
    : (post.author.name ?? "Autorul");
  const myRating = isAuthor
    ? post.transaction?.posterRating
    : post.transaction?.collectorRating;

  const showCollector =
    post.collector &&
    (post.status === "IN_PROGRESS" ||
      post.status === "COMPLETED" ||
      post.status === "CANCELLED" ||
      (post.status === "CLAIMED" && isAuthor));

  const canCancel =
    ["OPEN", "CLAIMED", "IN_PROGRESS"].includes(post.status) &&
    (isAuthor || isCollector);

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
        if (!res.ok) setActionError(j.error ?? "Eroare");
        else mutate();
      } catch {
        setActionError("Eroare de rețea.");
      } finally {
        setActionLoading(false);
      }
    },
    [post.id, mutate],
  );

  const handleCancel = useCallback(
    async (reason: string) => {
      setShowCancel(false);
      setActionLoading(true);
      setActionError("");
      try {
        const res = await fetch(`/api/v1/posts/${post.id}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason || null }),
        });
        const j = await res.json();
        if (!res.ok) setActionError(j.error ?? "Eroare");
        else mutate();
      } catch {
        setActionError("Eroare de rețea.");
      } finally {
        setActionLoading(false);
      }
    },
    [post.id, mutate],
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 lg:px-10 py-6 lg:py-8 space-y-0 max-w-xl lg:max-w-none">
        {/* Back + Status */}
        <div className="flex items-center justify-between mb-7">
          <Link
            href={`/${isAuthor ? "profil/postari" : "map"}`}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {isAuthor ? "Postările mele" : "Harta de colectare"}
          </Link>
          <span
            className={`text-xs font-bold px-3 py-1.5 rounded-full ${statusCfg.className}`}
          >
            {statusCfg.label}
          </span>
        </div>

        {/* Title */}
        <div className="mb-7">
          <div className="flex items-baseline gap-3 mb-1.5">
            <h1 className="text-5xl font-black text-[#123424] tabular-nums leading-none">
              {post.bottleCount}
            </h1>
            <span className="text-2xl text-slate-300 font-light">sticle</span>
          </div>
          {post.locationName && (
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="text-sm">{post.locationName}</span>
            </div>
          )}
          {post.status === "OPEN" && post.expiresAt && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3 h-3" />
              <ExpiryText expiresAt={post.expiresAt} />
            </div>
          )}
          {post.description && (
            <p className="text-sm text-slate-600 mt-4 whitespace-pre-wrap">
              {post.description}
            </p>
          )}{" "}
          <div className="flex items-center gap-4 text-xs text-slate-400 mt-4">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Publicat la{" "}
              {new Date(post.createdAt).toLocaleDateString("ro-RO", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            {post.completedAt && (
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-lime-400" />
                Finalizat la{" "}
                {new Date(post.completedAt).toLocaleDateString("ro-RO", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
          </div>
        </div>

        <div className="h-px bg-slate-100 mb-7" />

        {/* Earnings */}
        <div className="mb-7">
          {post.status === "COMPLETED" && myActualEarning !== null ? (
            <>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm text-slate-500">{myLabel}</span>
                <span className="text-4xl font-black text-lime-600 leading-none">
                  +{myActualEarning.toFixed(2)}
                </span>
                <span className="text-lg text-slate-400 font-light">RON</span>
              </div>
              <p className="text-xs text-slate-400">
                {theirLabel} {theirEarning.toFixed(2)} RON din{" "}
                {post.transaction!.actualValue.toFixed(2)} RON
              </p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm text-slate-500">{myLabel}</span>
                <span className="text-4xl font-black text-lime-600 leading-none">
                  ~{myEarning.toFixed(2)}
                </span>
                <span className="text-lg text-slate-400 font-light">RON</span>
              </div>
              <p className="text-xs text-slate-400">
                {theirLabel} {theirEarning.toFixed(2)} RON din{" "}
                {post.estimatedValue.toFixed(2)} RON
              </p>
            </>
          )}
          <div className="mt-3 h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-[#123424] rounded-l-full"
              style={{ width: `${posterPct}%` }}
            />
            <div
              className="h-full bg-lime-400 rounded-r-full"
              style={{ width: `${post.collectorSharePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>Autorul primește {posterPct}%</span>
            <span>Colectorul primește {post.collectorSharePercent}%</span>
          </div>
        </div>

        <div className="h-px bg-slate-100 mb-7" />

        {/* Participants */}
        <div className="space-y-4 mb-7">
          <PersonRow
            user={post.author}
            role="Autor"
            showPhone={isCollector && post.status === "IN_PROGRESS"}
          />
          {showCollector && post.collector ? (
            <PersonRow
              user={post.collector}
              role="Colector"
              showPhone={isAuthor && post.status === "IN_PROGRESS"}
            />
          ) : post.status === "OPEN" ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center">
                <span className="text-slate-300 text-base">?</span>
              </div>
              <span className="text-sm text-slate-400">
                Aștepți un colector…
              </span>
            </div>
          ) : null}
        </div>

        <div className="h-px bg-slate-100 mb-7" />

        {/* ── ACTION AREA ──────────────────────────────────────────────── */}

        {/* OPEN — poster waiting */}
        {post.status === "OPEN" && isAuthor && (
          <div className="mb-7">
            <p className="text-sm text-slate-500 leading-relaxed">
              Anunțul tău este vizibil pe hartă. Vei fi notificat imediat ce un
              colector face o cerere.
            </p>
          </div>
        )}

        {/* CLAIMED — poster approve/deny */}
        {post.status === "CLAIMED" && isAuthor && post.collector && (
          <div className="mb-7 space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-0.5">
                {post.collector.name} vrea să colecteze
              </p>
              <p className="text-xs text-slate-500">
                Aprobă pentru a porni colectarea. Dacă aprobi, colectorul are 30
                min să ajungă.
              </p>
            </div>
            {actionError && (
              <p className="text-sm text-red-500 font-medium">{actionError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => handleApprove("deny")}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-40 cursor-pointer"
              >
                <XCircle className="w-4 h-4" /> Refuză
              </button>
              <button
                onClick={() => handleApprove("approve")}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#123424] text-white font-bold text-sm hover:bg-[#1a4d36] transition-all disabled:opacity-40 cursor-pointer shadow-sm"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Aprobă
              </button>
            </div>
          </div>
        )}

        {/* CLAIMED — collector waiting */}
        {post.status === "CLAIMED" && isCollector && (
          <div className="mb-7 flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-400 animate-pulse shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Cerere trimisă
              </p>
              <p className="text-xs text-slate-500">
                Aștepți aprobarea autorului…
              </p>
            </div>
          </div>
        )}

        {/* IN_PROGRESS — timer + code */}
        {post.status === "IN_PROGRESS" && (
          <div className="mb-7 space-y-6">
            {post.expiresAt && <Countdown deadline={post.expiresAt} />}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {isAuthor ? "Codul tău de confirmare" : "Introdu codul"}
              </p>
              {isAuthor ? (
                showCode ? (
                  <CodeDisplay postId={post.id} />
                ) : (
                  <button
                    onClick={() => setShowCode(true)}
                    className="w-full py-3.5 rounded-xl bg-[#123424] text-white font-bold text-sm hover:bg-[#1a4d36] transition-all cursor-pointer"
                  >
                    Afișează codul
                  </button>
                )
              ) : (
                <CodeEntry postId={post.id} onComplete={() => mutate()} />
              )}
            </div>
          </div>
        )}

        {/* COMPLETED — summary + review */}
        {post.status === "COMPLETED" && post.transaction && (
          <div className="mb-7 space-y-5">
            <div className="bg-lime-50 border border-lime-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-lime-600" />
                <span className="text-sm font-bold text-lime-800">
                  Tranzacție finalizată
                </span>
                <span className="text-xs text-lime-500 ml-auto">
                  {new Date(post.transaction.completedAt).toLocaleDateString(
                    "ro-RO",
                    { day: "numeric", month: "short", year: "numeric" },
                  )}
                </span>
              </div>
              {[
                [
                  "Sticle colectate",
                  `${Math.round(post.transaction.actualValue / 0.5)} buc`,
                ],
                [
                  "Valoare totală",
                  `${post.transaction.actualValue.toFixed(2)} RON`,
                ],
                [
                  isAuthor ? "Tu ai primit" : "Tu ai câștigat",
                  `+${myActualEarning?.toFixed(2)} RON`,
                ],
              ].map(([label, value], i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span
                    className={`font-bold ${i === 2 ? "text-lime-700" : "text-slate-800"}`}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Evaluare
              </p>
              <ReviewForm
                postId={post.id}
                targetName={targetName}
                alreadyReviewed={!!myRating}
                onDone={() => mutate()}
              />
            </div>
          </div>
        )}

        {/* CANCELLED / EXPIRED */}
        {/* {(post.status === "CANCELLED" || post.status === "EXPIRED") && (
          <div className="mb-7">
            <p className="text-sm text-slate-500">
              {post.status === "CANCELLED"
                ? "Anunțul a fost anulat."
                : "Anunțul a expirat."}
            </p>
          </div>
        )} */}

        {actionError && !["CLAIMED"].includes(post.status) && (
          <p className="text-sm text-red-500 font-medium mb-5">{actionError}</p>
        )}

        {canCancel && (
          <div className="mb-7">
            <button
              onClick={() => setShowCancel(true)}
              disabled={actionLoading}
              className="text-sm text-red-400 hover:text-red-600 font-medium transition-colors cursor-pointer disabled:opacity-40"
            >
              {post.status === "CLAIMED" && isAuthor
                ? "Refuză cererea"
                : "Anulează anunțul"}
            </button>
          </div>
        )}

        <div className="h-px bg-slate-100 mb-7" />

        <div className="mb-4">
          <NavButtons lat={post.latitude} lng={post.longitude} />
        </div>
      </div>

      {showCancel && (
        <CancelModal
          onConfirm={handleCancel}
          onClose={() => setShowCancel(false)}
          isAuthor={!!isAuthor}
          status={post.status}
        />
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PostDetailClient({
  postId,
  userId,
}: {
  postId: string;
  userId: string;
}) {
  const { data: post, mutate } = useSWR<Post>(
    `/api/v1/posts/${postId}`,
    fetcher,
    {
      refreshInterval: (d) =>
        d?.status === "IN_PROGRESS" || d?.status === "CLAIMED" ? 5000 : 0,
      revalidateOnFocus: true,
    },
  );

  if (!post) return <Skeleton />;
  if (!post.id)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4">
        <FaWineBottle className="w-10 h-10 text-slate-300" />
        <p className="text-slate-500 font-medium">Anunțul nu a fost găsit.</p>
        <Link
          href="/map"
          className="text-sm text-[#123424] font-semibold hover:underline flex items-center gap-1"
        >
          Hartă <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    );

  const isAuthor = post.isAuthor ?? post.author?.id === userId;
  const isCollector = post.isCollector ?? post.collector?.id === userId;

  return (
    <>
      {/* Mobile: map top, panel below */}
      <div className="lg:hidden flex flex-col min-h-[calc(100vh-64px)]">
        <div className="relative h-[260px] shrink-0">
          <PostMap
            lat={post.latitude}
            lng={post.longitude}
            locationName={post.locationName}
          />
        </div>
        <div className="flex-1 bg-white">
          <DetailPanel
            post={post}
            isAuthor={!!isAuthor}
            isCollector={!!isCollector}
            mutate={mutate}
          />
        </div>
      </div>

      {/* Desktop: map left 55%, panel right 45% */}
      <div className="hidden lg:flex" style={{ height: "calc(100vh - 64px)" }}>
        <div className="w-[55%] relative shrink-0">
          <PostMap
            lat={post.latitude}
            lng={post.longitude}
            locationName={post.locationName}
          />
        </div>
        <div className="flex-1 bg-white border-l border-slate-100 overflow-hidden">
          <DetailPanel
            post={post}
            isAuthor={!!isAuthor}
            isCollector={!!isCollector}
            mutate={mutate}
          />
        </div>
      </div>
    </>
  );
}
