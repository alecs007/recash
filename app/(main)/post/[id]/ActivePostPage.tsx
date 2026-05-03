"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import {
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  QrCode,
  Star,
  Phone,
  User,
  AlertTriangle,
  X,
} from "lucide-react";
import { FaWineBottle } from "react-icons/fa";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Timer component ──────────────────────────────────────────────────────────

function CountdownTimer({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      setRemaining(Math.max(0, diff));
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const totalMs = 30 * 60 * 1000;
  const percent = Math.min(100, (remaining / totalMs) * 100);
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const expired = remaining === 0;
  const urgent = remaining < 5 * 60 * 1000 && !expired;

  return (
    <div
      className={`p-4 rounded-2xl border-2 transition-all ${
        expired
          ? "bg-red-50 border-red-300"
          : urgent
            ? "bg-orange-50 border-orange-300 animate-pulse"
            : "bg-lime-50 border-lime-300"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock
            className={`w-4 h-4 ${expired ? "text-red-500" : urgent ? "text-orange-500" : "text-lime-600"}`}
          />
          <span
            className={`text-sm font-bold ${expired ? "text-red-600" : urgent ? "text-orange-600" : "text-lime-700"}`}
          >
            {expired ? "Timp expirat!" : urgent ? "Grăbește-te!" : "Timp rămas"}
          </span>
        </div>
        <span
          className={`text-2xl font-black tabular-nums ${expired ? "text-red-600" : urgent ? "text-orange-600" : "text-lime-700"}`}
        >
          {expired
            ? "00:00"
            : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-1000 ${expired ? "bg-red-400" : urgent ? "bg-orange-400" : "bg-lime-400"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-1.5">
        {expired
          ? "Colectarea a expirat. Anunțul va fi marcat expirat."
          : "Colectorul trebuie să ajungă la tine în acest timp."}
      </p>
    </div>
  );
}

// ─── QR code display (for poster) ────────────────────────────────────────────

function QRDisplay({ postId }: { postId: string }) {
  const { data, error, isLoading } = useSWR(
    `/api/v1/posts/${postId}/qr`,
    fetcher,
    { refreshInterval: 0, revalidateOnFocus: false },
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 p-6">
        <div className="w-48 h-48 bg-slate-100 rounded-2xl animate-pulse" />
        <p className="text-sm text-slate-500">Se generează codul QR...</p>
      </div>
    );
  }

  if (error || !data?.qrImageUrl) {
    return (
      <div className="text-center p-6">
        <p className="text-sm text-red-500">Nu s-a putut genera codul QR.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <div className="p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data.qrImageUrl}
          alt="QR Code"
          width={200}
          height={200}
          className="block"
        />
      </div>
      <p className="text-xs text-slate-500 text-center max-w-xs">
        Arată acest cod colectorului. El îl scanează când ajunge la tine pentru
        a confirma colectarea.
      </p>
    </div>
  );
}

// ─── QR Scanner (for collector) ──────────────────────────────────────────────

function QRScanner({
  postId,
  onComplete,
}: {
  postId: string;
  onComplete: () => void;
}) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bottles, setBottles] = useState("");

  const handleScan = async () => {
    if (!token.trim()) {
      setError("Introdu tokenul din QR sau scanează-l.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/posts/${postId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          actualBottleCount: bottles ? parseInt(bottles) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Eroare la finalizare.");
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
      <p className="text-sm text-slate-600">
        Cere posterului să îți arate codul QR și introdu tokenul de mai jos, sau
        accesează direct linkul din QR.
      </p>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Token QR
        </label>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Lipește tokenul din QR..."
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-100 outline-none text-sm font-mono bg-white"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Număr real de sticle{" "}
          <span className="text-slate-400 font-normal">(dacă diferă)</span>
        </label>
        <input
          type="number"
          value={bottles}
          onChange={(e) => setBottles(e.target.value)}
          placeholder="Lasă gol dacă e același"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-100 outline-none text-sm bg-white"
        />
      </div>
      {error && <p className="text-red-500 text-sm font-semibold">{error}</p>}
      <button
        onClick={handleScan}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-lime-400 text-black font-bold text-sm hover:bg-lime-300 transition-all disabled:opacity-40 cursor-pointer"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
        ) : (
          <CheckCircle className="w-4 h-4" />
        )}
        Confirmă colectarea
      </button>
    </div>
  );
}

// ─── Cancel confirmation modal ────────────────────────────────────────────────

function CancelModal({
  onConfirm,
  onClose,
  isAuthor,
  status,
}: {
  onConfirm: (reason: string) => void;
  onClose: () => void;
  isAuthor: boolean;
  status: PostStatus;
}) {
  const [reason, setReason] = useState("");

  const getMessage = () => {
    if (status === "IN_PROGRESS" && !isAuthor)
      return "Ești sigur că vrei să anulezi? Colectarea este în desfășurare.";
    if (status === "IN_PROGRESS" && isAuthor)
      return "Ești sigur că vrei să anulezi? Colectorul este pe drum.";
    if (status === "CLAIMED" && isAuthor)
      return "Vrei să respingi cererea colectorului? Anunțul va deveni din nou disponibil.";
    if (status === "CLAIMED" && !isAuthor)
      return "Vrei să renunți la colectare? Anunțul va deveni din nou disponibil.";
    return "Ești sigur că vrei să anulezi?";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <h3 className="font-bold text-slate-900 mb-2">Confirmare anulare</h3>
        <p className="text-sm text-slate-600 mb-4">{getMessage()}</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motiv (opțional)..."
          rows={2}
          maxLength={200}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm resize-none focus:border-red-300 outline-none mb-4"
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:border-slate-300 transition-all cursor-pointer"
          >
            Nu, înapoi
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="flex-1 py-2.5 rounded-full bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all cursor-pointer"
          >
            Da, anulează
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Review form ──────────────────────────────────────────────────────────────

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
  const [hovered, setHovered] = useState(0);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (alreadyReviewed) {
    return (
      <div className="text-center py-4">
        <CheckCircle className="w-8 h-8 text-lime-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">
          Ai acordat deja un rating!
        </p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Selectează un rating.");
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
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Eroare la trimitere.");
        setLoading(false);
        return;
      }
      onDone();
    } catch {
      setError("Eroare de rețea.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Cum a decurs colaborarea cu <strong>{targetName}</strong>?
      </p>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="cursor-pointer transition-transform hover:scale-110"
          >
            <Star
              className={`w-9 h-9 transition-colors ${
                star <= (hovered || rating)
                  ? "text-lime-400 fill-lime-400"
                  : "text-slate-300"
              }`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Lasă un comentariu (opțional)..."
        rows={2}
        maxLength={500}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-100 outline-none text-sm resize-none bg-white"
      />
      {error && <p className="text-red-500 text-sm font-semibold">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={loading || rating === 0}
        className="w-full py-3 rounded-full bg-lime-400 text-black font-bold text-sm hover:bg-lime-300 transition-all disabled:opacity-40 cursor-pointer"
      >
        {loading ? "Se trimite..." : "Trimite rating"}
      </button>
    </div>
  );
}

// ─── User card ────────────────────────────────────────────────────────────────

function UserCard({
  user,
  role,
  showPhone,
}: {
  user: Post["author"] | NonNullable<Post["collector"]>;
  role: string;
  showPhone: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100">
      <div className="w-12 h-12 rounded-full bg-lime-50 border border-lime-200 flex items-center justify-center overflow-hidden shrink-0">
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? ""}
            width={48}
            height={48}
            className="object-cover"
          />
        ) : (
          <User className="w-5 h-5 text-lime-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-sm text-slate-900 truncate">
            {user.name ?? "Utilizator"}
          </p>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
            {role}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <Star className="w-3 h-3 text-lime-400 fill-lime-400" />
          <span className="text-xs font-semibold text-slate-600">
            {user.reputationScore.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400">
            ({user.ratingCount} recenzii)
          </span>
        </div>
        {showPhone && user.phone && (
          <a
            href={`tel:${user.phone}`}
            className="flex items-center gap-1 mt-1 text-xs font-semibold text-[#123424] hover:underline"
          >
            <Phone className="w-3 h-3" />
            {user.phone}
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PostStatus,
  { label: string; color: string; bg: string }
> = {
  OPEN: {
    label: "Deschis",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
  },
  CLAIMED: {
    label: "Revendicat — Așteptare aprobare",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  IN_PROGRESS: {
    label: "Colectare în desfășurare",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
  COMPLETED: {
    label: "Finalizat",
    color: "text-lime-700",
    bg: "bg-lime-50 border-lime-200",
  },
  CANCELLED: {
    label: "Anulat",
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
  },
  EXPIRED: {
    label: "Expirat",
    color: "text-slate-600",
    bg: "bg-slate-50 border-slate-200",
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ActivePostClient({
  postId,
  userId,
}: {
  postId: string;
  userId: string;
}) {
  const [showCancel, setShowCancel] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // Poll actively when IN_PROGRESS or CLAIMED
  const { data: post, mutate } = useSWR<Post>(
    `/api/v1/posts/${postId}`,
    fetcher,
    {
      refreshInterval: (data) => {
        if (data?.status === "IN_PROGRESS" || data?.status === "CLAIMED")
          return 5000;
        return 0;
      },
      revalidateOnFocus: true,
    },
  );

  const isAuthor = post?.isAuthor ?? post?.author?.id === userId;
  const isCollector = post?.isCollector ?? post?.collector?.id === userId;

  const handleApprove = useCallback(
    async (action: "approve" | "deny") => {
      setActionLoading(true);
      setActionError("");
      try {
        const res = await fetch(`/api/v1/posts/${postId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const json = await res.json();
        if (!res.ok) {
          setActionError(json.error ?? "Eroare.");
        } else {
          mutate();
        }
      } catch {
        setActionError("Eroare de rețea.");
      } finally {
        setActionLoading(false);
      }
    },
    [postId, mutate],
  );

  const handleCancel = useCallback(
    async (reason: string) => {
      setShowCancel(false);
      setActionLoading(true);
      setActionError("");
      try {
        const res = await fetch(`/api/v1/posts/${postId}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason || null }),
        });
        const json = await res.json();
        if (!res.ok) {
          setActionError(json.error ?? "Eroare.");
        } else {
          mutate();
        }
      } catch {
        setActionError("Eroare de rețea.");
      } finally {
        setActionLoading(false);
      }
    },
    [postId, mutate],
  );

  if (!post) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-2/3 bg-slate-100 rounded-2xl" />
          <div className="h-32 bg-slate-100 rounded-3xl" />
          <div className="h-24 bg-slate-100 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (post.id === undefined) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-slate-500">Anunțul nu a fost găsit.</p>
        <Link
          href="/map"
          className="text-lime-600 font-semibold text-sm mt-2 block"
        >
          ← Înapoi la hartă
        </Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[post.status];
  const posterPercent = 100 - post.collectorSharePercent;
  const isDonation = post.collectorSharePercent === 100;

  const myRating = isAuthor
    ? post.transaction?.posterRating
    : post.transaction?.collectorRating;
  const targetName = isAuthor
    ? (post.collector?.name ?? "Colectorul")
    : (post.author.name ?? "Posterul");

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4 min-h-[100dvh]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/profil/postari"
          className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-slate-300 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-extrabold text-slate-900 text-lg leading-tight truncate">
            {post.bottleCount} sticle
          </h1>
          <span
            className={`inline-block mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.color}`}
          >
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* ── CLAIMED: Approve/Deny (poster only) ─────────────────────────────── */}
      {post.status === "CLAIMED" && isAuthor && post.collector && (
        <div className="p-5 bg-blue-50 rounded-3xl border-2 border-blue-200">
          <h2 className="font-extrabold text-blue-900 text-base mb-1">
            Cerere de colectare!
          </h2>
          <p className="text-sm text-blue-700 mb-4">
            <strong>{post.collector.name}</strong> dorește să colecteze sticlele
            tale.
          </p>
          <UserCard user={post.collector} role="Colector" showPhone={false} />
          {actionError && (
            <p className="text-red-500 text-sm mt-2">{actionError}</p>
          )}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => handleApprove("deny")}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-all disabled:opacity-40 cursor-pointer"
            >
              <XCircle className="w-4 h-4" /> Refuză
            </button>
            <button
              onClick={() => handleApprove("approve")}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-[#123424] text-white font-bold text-sm hover:bg-[#1a4d36] transition-all disabled:opacity-40 cursor-pointer"
            >
              {actionLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Aprobă
            </button>
          </div>
        </div>
      )}

      {/* ── CLAIMED: Waiting (collector only) ──────────────────────────────── */}
      {post.status === "CLAIMED" && isCollector && (
        <div className="p-5 bg-blue-50 rounded-3xl border-2 border-blue-200 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-blue-600 animate-pulse" />
          </div>
          <h2 className="font-extrabold text-blue-900 mb-1">Cerere trimisă!</h2>
          <p className="text-sm text-blue-700">
            Aștepți ca posterul să aprobe cererea ta. Vei fi notificat imediat.
          </p>
        </div>
      )}

      {/* ── IN_PROGRESS: Active collection ─────────────────────────────────── */}
      {post.status === "IN_PROGRESS" && post.expiresAt && (
        <>
          <CountdownTimer deadline={post.expiresAt} />

          {/* QR Section */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#123424]" />
              <h2 className="font-bold text-slate-900">
                {isAuthor ? "Codul tău QR" : "Scanează codul QR"}
              </h2>
            </div>
            <div className="p-4">
              {isAuthor ? (
                <>
                  <p className="text-sm text-slate-600 mb-3">
                    Arată acest cod colectorului când ajunge la tine pentru a
                    finaliza schimbul.
                  </p>
                  {showQR ? (
                    <QRDisplay postId={postId} />
                  ) : (
                    <button
                      onClick={() => setShowQR(true)}
                      className="w-full py-3 rounded-full bg-[#123424] text-white font-bold text-sm hover:bg-[#1a4d36] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <QrCode className="w-4 h-4" /> Afișează codul QR
                    </button>
                  )}
                </>
              ) : (
                <QRScanner postId={postId} onComplete={() => mutate()} />
              )}
            </div>
          </div>
        </>
      )}

      {/* ── COMPLETED: Transaction summary ─────────────────────────────────── */}
      {post.status === "COMPLETED" && post.transaction && (
        <div className="p-5 bg-lime-50 rounded-3xl border-2 border-lime-300">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-6 h-6 text-lime-600" />
            <h2 className="font-extrabold text-lime-800 text-base">
              Tranzacție finalizată!
            </h2>
          </div>
          <div className="space-y-2">
            <SummaryRow
              label="Sticle colectate"
              value={`${(post.transaction.actualValue / 0.5) | 0} buc`}
            />
            <SummaryRow
              label="Valoare totală"
              value={`${post.transaction.actualValue.toFixed(2)} RON`}
            />
            <SummaryRow
              label={isAuthor ? "Tu ai primit" : "Tu ai câștigat"}
              value={`+${(isAuthor ? post.transaction.posterEarning : post.transaction.collectorEarning).toFixed(2)} RON`}
              highlight
            />
          </div>
        </div>
      )}

      {/* ── Review section (after completion) ──────────────────────────────── */}
      {post.status === "COMPLETED" && (isAuthor || isCollector) && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-lime-400 fill-lime-400" />
            Evaluează experiența
          </h2>
          {!reviewDone ? (
            <ReviewForm
              postId={postId}
              targetName={targetName}
              alreadyReviewed={!!myRating}
              onDone={() => {
                setReviewDone(true);
                mutate();
              }}
            />
          ) : (
            <div className="text-center py-2">
              <CheckCircle className="w-8 h-8 text-lime-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                Mulțumim pentru feedback!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Post details */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3">
        <h2 className="font-bold text-slate-900 text-base">Detalii anunț</h2>

        {/* Participants */}
        <UserCard
          user={post.author}
          role="Poster"
          showPhone={isCollector && post.status === "IN_PROGRESS"}
        />
        {post.collector && (
          <UserCard
            user={post.collector}
            role="Colector"
            showPhone={isAuthor && post.status === "IN_PROGRESS"}
          />
        )}

        <div className="pt-2 space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <FaWineBottle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-slate-700">
              {post.bottleCount} sticle · {post.description}
            </p>
          </div>
          {post.locationName && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <p className="text-slate-700">{post.locationName}</p>
            </div>
          )}
          <div className="flex items-center gap-4 pt-1">
            <div className="text-xs">
              <span className="text-slate-400">Tu primești</span>
              <span className="font-bold text-slate-900 ml-1">
                {isDonation ? "0%" : `${posterPercent}%`}
              </span>
            </div>
            <div className="text-xs">
              <span className="text-slate-400">Colector</span>
              <span className="font-bold text-lime-600 ml-1">
                {post.collectorSharePercent}%{isDonation ? " (donație)" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-semibold">
          {actionError}
        </div>
      )}

      {/* Cancel button */}
      {["OPEN", "CLAIMED", "IN_PROGRESS"].includes(post.status) &&
        (isAuthor || isCollector) && (
          <button
            onClick={() => setShowCancel(true)}
            disabled={actionLoading}
            className="w-full py-3 rounded-full border-2 border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50 hover:border-red-300 transition-all cursor-pointer"
          >
            {post.status === "CLAIMED" && isAuthor
              ? "Refuză cererea"
              : "Anulează"}
          </button>
        )}

      {/* Map link */}
      <Link
        href={`https://www.google.com/maps?q=${post.latitude},${post.longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-full border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:border-slate-300 transition-all"
      >
        <MapPin className="w-4 h-4" /> Deschide în Maps
      </Link>

      {/* Cancel modal */}
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

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-lime-200 last:border-0">
      <span className="text-sm text-lime-700">{label}</span>
      <span
        className={`text-sm font-bold ${highlight ? "text-lime-700 text-lg" : "text-lime-800"}`}
      >
        {value}
      </span>
    </div>
  );
}
