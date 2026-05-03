"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAuthModal } from "@/context/AuthModalContext";
import {
  MapPin,
  Search,
  Loader2,
  Navigation,
  X,
  Star,
  Clock,
  ChevronRight,
  SlidersHorizontal,
  List,
  Map as MapIcon,
} from "lucide-react";
import { FaWineBottle } from "react-icons/fa";
import useSWR from "swr";

// ─── Types ────────────────────────────────────────────────────────────────────

type Post = {
  id: string;
  status: string;
  description: string;
  bottleCount: number;
  estimatedValue: number;
  collectorSharePercent: number;
  latitude: number;
  longitude: number;
  locationName: string | null;
  images: string[];
  createdAt: string;
  expiresAt: string | null;
  author: {
    id: string;
    name: string | null;
    image: string | null;
    reputationScore: number;
    ratingCount: number;
  };
};

type ActiveData = {
  activePost: { id: string } | null;
  activeCollection: { id: string } | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Leaflet — module-level singleton ────────────────────────────────────────
// Prevents duplicate script/CSS injection across React re-renders and HMR.

let _leafletPromise: Promise<void> | null = null;

function ensureLeaflet(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).L) return Promise.resolve();

  // Check if script is already in document but not finished loading
  const existingScript = document.querySelector('script[src*="leaflet.js"]');
  if (existingScript && _leafletPromise) return _leafletPromise;

  _leafletPromise = new Promise<void>((resolve, reject) => {
    // 1. Inject CSS if missing
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
    }

    // 2. Inject Script
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;

    script.onload = () => resolve();
    script.onerror = (err) => {
      _leafletPromise = null; // Essential: Reset so retry is possible
      console.error("Leaflet injection failed", err);
      reject(new Error("Failed to load Leaflet"));
    };

    document.head.appendChild(script);
  });

  return _leafletPromise;
}

function useLeaflet() {
  const [ready, setReady] = useState(
    () => typeof window !== "undefined" && !!(window as any).L,
  );

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    ensureLeaflet()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [ready]);

  return ready;
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  selected,
  onClick,
  onClaim,
  claiming,
  canClaim,
  isLoggedIn,
}: {
  post: Post;
  selected: boolean;
  onClick: () => void;
  onClaim: (id: string) => void;
  claiming: string | null;
  canClaim: boolean;
  isLoggedIn: boolean;
}) {
  const collectorEarning =
    (post.estimatedValue * post.collectorSharePercent) / 100;
  const hoursLeft = post.expiresAt
    ? Math.max(
        0,
        Math.floor(
          (new Date(post.expiresAt).getTime() - Date.now()) / 3_600_000,
        ),
      )
    : null;
  const urgent = hoursLeft !== null && hoursLeft < 6;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border-2 p-4 cursor-pointer transition-all hover:shadow-sm ${
        selected
          ? "border-lime-400 shadow-md shadow-lime-100/60"
          : "border-slate-100 hover:border-lime-200"
      }`}
    >
      {/* Author row */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-9 h-9 rounded-full bg-lime-50 border border-lime-200 flex items-center justify-center overflow-hidden shrink-0">
          {post.author.image ? (
            <Image
              src={post.author.image}
              alt={post.author.name ?? ""}
              width={36}
              height={36}
              className="object-cover"
            />
          ) : (
            <span className="text-xs font-bold text-lime-700">
              {post.author.name?.[0] ?? "?"}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate leading-tight">
            {post.author.name ?? "Utilizator"}
          </p>
          <div className="flex items-center gap-1">
            <Star className="w-2.5 h-2.5 text-lime-400 fill-lime-400" />
            <span className="text-[10px] font-semibold text-slate-400">
              {post.author.reputationScore.toFixed(1)}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-black text-slate-900 leading-none">
            {post.bottleCount}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">sticle</p>
        </div>
      </div>

      {/* Location */}
      {post.locationName && (
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 truncate">
            {post.locationName}
          </span>
        </div>
      )}

      {/* Description */}
      {post.description && (
        <p className="text-xs text-slate-400 mb-2.5 line-clamp-2 italic leading-relaxed">
          &quot;{post.description}&quot;
        </p>
      )}

      {/* Earning strip */}
      <div className="flex items-center justify-between mb-3 px-3 py-2 bg-slate-50 rounded-xl">
        <div className="text-xs text-slate-600">
          <span className="font-black text-lime-600 text-sm">
            {post.collectorSharePercent}%
          </span>
          <span className="text-slate-400"> pentru tine</span>
        </div>
        <div className="flex items-center gap-1.5">
          {urgent && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <Clock className="w-2.5 h-2.5" />
              {hoursLeft}h
            </span>
          )}
          <span className="text-xs font-black text-slate-800">
            ~{collectorEarning.toFixed(2)} RON
          </span>
        </div>
      </div>

      {/* Claim button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClaim(post.id);
        }}
        disabled={isLoggedIn && (!canClaim || claiming === post.id)}
        className="w-full py-2.5 rounded-xl bg-[#123424] text-white text-xs font-bold hover:bg-[#1a4d36] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
      >
        {claiming === post.id ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <>
            <FaWineBottle className="w-3.5 h-3.5 text-lime-400" />
            {isLoggedIn ? "Colectează" : "Autentifică-te pentru a colecta"}
          </>
        )}
      </button>
    </div>
  );
}

// ─── Selected Post Overlay ────────────────────────────────────────────────────

function SelectedPostOverlay({
  post,
  onClose,
  onClaim,
  claiming,
  canClaim,
  isLoggedIn,
}: {
  post: Post;
  onClose: () => void;
  onClaim: (id: string) => void;
  claiming: string | null;
  canClaim: boolean;
  isLoggedIn: boolean;
}) {
  const collectorEarning =
    (post.estimatedValue * post.collectorSharePercent) / 100;

  return (
    <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 pointer-events-auto z-[1000]">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#123424] to-[#1a4d36] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
              {post.author.image ? (
                <Image
                  src={post.author.image}
                  alt=""
                  width={32}
                  height={32}
                  className="object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-white">
                  {post.author.name?.[0] ?? "?"}
                </span>
              )}
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">
                {post.bottleCount} sticle
              </p>
              {post.locationName && (
                <p className="text-white/60 text-xs truncate max-w-[160px]">
                  {post.locationName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-lime-50 rounded-xl p-2.5 text-center border border-lime-100">
              <p className="text-[10px] text-slate-500 mb-0.5">Tu câștigești</p>
              <p className="text-base font-black text-lime-700">
                ~{collectorEarning.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400">RON</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
              <p className="text-[10px] text-slate-500 mb-0.5">Procentaj</p>
              <p className="text-base font-black text-slate-800">
                {post.collectorSharePercent}%
              </p>
              <p className="text-[10px] text-slate-400">din total</p>
            </div>
          </div>

          {post.description && (
            <p className="text-xs text-slate-500 italic line-clamp-2 mb-3 leading-relaxed">
              &quot;{post.description}&quot;
            </p>
          )}

          <button
            onClick={() => onClaim(post.id)}
            disabled={isLoggedIn && (!canClaim || claiming === post.id)}
            className="w-full py-3 rounded-xl bg-[#123424] text-white text-sm font-bold hover:bg-[#1a4d36] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {claiming === post.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <FaWineBottle className="w-4 h-4 text-lime-400" />
                {isLoggedIn ? "Colectează acum" : "Autentifică-te"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Map Component ────────────────────────────────────────────────────────────

function PostMap({
  posts,
  userLocation,
  selectedId,
  onSelectPost,
}: {
  posts: Post[];
  userLocation: [number, number] | null;
  selectedId: string | null;
  onSelectPost: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const userMarkerRef = useRef<any>(null);
  const onSelectRef = useRef(onSelectPost);
  const leafletReady = useLeaflet();

  // Keep callback ref fresh without re-running effects
  onSelectRef.current = onSelectPost;

  // Init map exactly once
  useEffect(() => {
    if (!leafletReady || !containerRef.current || mapRef.current) return;

    const L = (window as any).L;
    const map = L.map(containerRef.current, {
      center: [45.9432, 24.9668], // Romania center
      zoom: 7,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© <a href='https://openstreetmap.org'>OpenStreetMap</a>",
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // ResizeObserver → invalidateSize when container is shown/resized
    const ro = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.invalidateSize({ animate: false });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      userMarkerRef.current = null;
    };
  }, [leafletReady]);

  // User location marker
  useEffect(() => {
    if (!mapRef.current || !userLocation || !(window as any).L) return;
    const L = (window as any).L;

    const pulseIcon = L.divIcon({
      className: "",
      html: `<div style="
        width:14px;height:14px;border-radius:50%;
        background:#3b82f6;border:3px solid white;
        box-shadow:0 0 0 6px rgba(59,130,246,0.2);
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userLocation);
    } else {
      userMarkerRef.current = L.marker(userLocation, { icon: pulseIcon })
        .addTo(mapRef.current)
        .bindPopup("Locația ta");
    }

    mapRef.current.setView(userLocation, 13, { animate: true });
  }, [userLocation]);

  // Sync markers with posts list
  useEffect(() => {
    if (!mapRef.current || !leafletReady || !(window as any).L) return;
    const L = (window as any).L;

    // Remove stale markers
    const postIds = new Set(posts.map((p) => p.id));
    markersRef.current.forEach((marker, id) => {
      if (!postIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add / update markers
    posts.forEach((post) => {
      const isSelected = post.id === selectedId;
      const n = post.bottleCount;
      const size = n >= 100 ? 44 : n >= 25 ? 38 : 32;
      const bg = isSelected ? "#a3e635" : "#123424";
      const fg = isSelected ? "#123424" : "#ffffff";
      const border = isSelected ? "#ffffff" : "rgba(255,255,255,0.8)";
      const shadow = isSelected
        ? "0 4px 12px rgba(0,0,0,0.4)"
        : "0 2px 6px rgba(0,0,0,0.28)";
      const scale = isSelected ? 1.18 : 1;
      const label = n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
      const fs = size <= 32 ? 10 : 12;

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${bg};border:2.5px solid ${border};
          box-shadow:${shadow};
          display:flex;align-items:center;justify-content:center;
          font-weight:800;font-size:${fs}px;font-family:sans-serif;
          color:${fg};cursor:pointer;
          transform:scale(${scale});
          transition:transform 0.15s, background 0.15s;
        ">${label}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const existing = markersRef.current.get(post.id);
      if (existing) {
        existing.setIcon(icon);
      } else {
        const marker = L.marker([post.latitude, post.longitude], { icon })
          .addTo(mapRef.current)
          .on("click", () => onSelectRef.current(post.id));
        markersRef.current.set(post.id, marker);
      }
    });
  }, [posts, selectedId, leafletReady]);

  // Pan to selected post
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const post = posts.find((p) => p.id === selectedId);
    if (post) {
      mapRef.current.panTo([post.latitude, post.longitude], {
        animate: true,
        duration: 0.4,
      });
    }
  }, [selectedId, posts]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {!leafletReady && (
        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
            <p className="text-sm text-slate-400">Se încarcă harta...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-28 bg-slate-100 rounded-lg" />
          <div className="h-2.5 w-16 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-7 w-8 bg-slate-100 rounded-lg" />
      </div>
      <div className="h-3 w-36 bg-slate-100 rounded-lg" />
      <div className="h-8 bg-slate-100 rounded-xl" />
      <div className="h-9 bg-slate-100 rounded-xl" />
    </div>
  );
}

// ─── Main Map Page ────────────────────────────────────────────────────────────

export default function MapPage() {
  const { data: session } = useSession();
  const { open: openAuthModal } = useAuthModal();
  const router = useRouter();

  // "list" | "map" — only meaningful on mobile
  const [mobileView, setMobileView] = useState<"list" | "map">("map");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );
  const [geoLoading, setGeoLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [minBottles, setMinBottles] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const isLoggedIn = !!session?.user?.id;

  const { data, isLoading, mutate } = useSWR<{ posts: Post[] }>(
    "/api/v1/posts?limit=200",
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true },
  );

  const { data: activeData } = useSWR<ActiveData>(
    isLoggedIn ? "/api/v1/posts/active" : null,
    fetcher,
    { refreshInterval: 15_000 },
  );

  const posts = data?.posts ?? [];

  const filtered = posts.filter((p) => {
    if (minBottles > 0 && p.bottleCount < minBottles) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !p.locationName?.toLowerCase().includes(q) &&
        !p.description?.toLowerCase().includes(q) &&
        !p.author.name?.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const selectedPost = selectedId
    ? (filtered.find((p) => p.id === selectedId) ?? null)
    : null;

  const canClaim = isLoggedIn && !activeData?.activeCollection;

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

  const handleClaim = useCallback(
    async (postId: string) => {
      if (!isLoggedIn) {
        openAuthModal();
        return;
      }
      if (activeData?.activeCollection) {
        setClaimError("Ai deja o colectare activă. Finalizează-o mai întâi.");
        return;
      }

      setClaiming(postId);
      setClaimError(null);

      try {
        const res = await fetch(`/api/v1/posts/${postId}/claim`, {
          method: "POST",
        });
        const json = await res.json();

        if (!res.ok) {
          setClaimError(json.error ?? "Eroare la revendicare.");
          setClaiming(null);
          return;
        }

        await mutate();
        router.push(`/post/${postId}`);
      } catch {
        setClaimError("Eroare de rețea. Încearcă din nou.");
        setClaiming(null);
      }
    },
    [isLoggedIn, activeData, mutate, router, openAuthModal],
  );

  const handleSelectPost = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
    // Switch to map view on mobile so the overlay is visible
    setMobileView("map");
  }, []);

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-slate-100 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 max-w-7xl mx-auto">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută locație, autor..."
              className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:border-lime-400 focus:ring-2 focus:ring-lime-100 outline-none transition-shadow"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* GPS */}
          <button
            onClick={handleGetLocation}
            disabled={geoLoading}
            title="Folosește GPS-ul"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 shrink-0"
          >
            {geoLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            ) : (
              <Navigation className="w-4 h-4 text-[#123424]" />
            )}
          </button>

          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`p-2.5 rounded-xl border transition-colors shrink-0 ${
              showFilters || minBottles > 0
                ? "border-lime-400 bg-lime-50 text-lime-700"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Mobile view toggle */}
          <div className="flex sm:hidden items-center bg-slate-100 rounded-xl p-1 gap-0.5 shrink-0">
            <button
              onClick={() => setMobileView("list")}
              className={`p-2 rounded-lg transition-colors ${
                mobileView === "list"
                  ? "bg-white shadow-sm text-[#123424]"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setMobileView("map")}
              className={`p-2 rounded-lg transition-colors ${
                mobileView === "map"
                  ? "bg-white shadow-sm text-[#123424]"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter pills */}
        {showFilters && (
          <div className="max-w-7xl mx-auto flex items-center gap-2 flex-wrap pt-1">
            <span className="text-xs font-semibold text-slate-500">
              Minim sticle:
            </span>
            {[0, 10, 25, 50, 100].map((n) => (
              <button
                key={n}
                onClick={() => setMinBottles(n)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  minBottles === n
                    ? "bg-[#123424] text-white border-[#123424]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {n === 0 ? "Toate" : `${n}+`}
              </button>
            ))}
            {(minBottles > 0 || search) && (
              <button
                onClick={() => {
                  setMinBottles(0);
                  setSearch("");
                }}
                className="px-3 py-1 rounded-full text-xs font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
              >
                Resetează
              </button>
            )}
          </div>
        )}

        {/* Active collection banner */}
        {activeData?.activeCollection && (
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <span className="text-xs font-semibold text-amber-700">
                Ai o colectare activă în desfășurare
              </span>
              <Link
                href={`/post/${activeData.activeCollection.id}`}
                className="flex items-center gap-0.5 text-xs font-bold text-amber-700 hover:underline"
              >
                Vezi <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* Claim error banner */}
        {claimError && (
          <div className="max-w-7xl mx-auto">
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
          </div>
        )}
      </div>

      {/* ── Main layout ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* ── Sidebar (list) ──────────────────────────────────────────────────── */}
        {/*
          Always rendered in DOM so map isn't affected by sidebar mount/unmount.
          On mobile: hidden when map view is active.
          On desktop: fixed 320px wide, always visible.
        */}
        <div
          className={`
            flex flex-col bg-slate-50 border-r border-slate-100
            w-full sm:w-80 lg:w-96 shrink-0
            overflow-hidden
            ${mobileView === "list" ? "flex" : "hidden sm:flex"}
          `}
        >
          {/* Count row */}
          <div className="shrink-0 px-4 py-2 bg-white border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {isLoading ? (
                "Se încarcă..."
              ) : (
                <>
                  <span className="font-bold text-slate-800">
                    {filtered.length}
                  </span>{" "}
                  anunțuri disponibile
                </>
              )}
            </span>
            {!isLoggedIn && (
              <button
                onClick={openAuthModal}
                className="text-xs font-semibold text-lime-700 hover:underline"
              >
                Autentifică-te →
              </button>
            )}
          </div>

          {/* Scrollable post list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {isLoading ? (
              <>
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <FaWineBottle className="w-6 h-6 text-slate-300" />
                </div>
                <p className="font-bold text-slate-800 text-sm mb-1.5">
                  {search || minBottles > 0
                    ? "Niciun rezultat"
                    : "Niciun anunț activ"}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {search || minBottles > 0
                    ? "Încearcă să schimbi filtrele de căutare."
                    : "Momentan nu există sticle de colectat în zonă."}
                </p>
                {(search || minBottles > 0) && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setMinBottles(0);
                    }}
                    className="mt-3 text-xs font-semibold text-lime-700 hover:underline"
                  >
                    Resetează filtrele
                  </button>
                )}
              </div>
            ) : (
              filtered.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  selected={selectedId === post.id}
                  onClick={() => handleSelectPost(post.id)}
                  onClaim={handleClaim}
                  claiming={claiming}
                  canClaim={canClaim}
                  isLoggedIn={isLoggedIn}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Map panel ──────────────────────────────────────────────────────── */}
        {/*
          Also always in DOM. On mobile: hidden when list view is active.
          The ResizeObserver inside PostMap handles invalidateSize automatically.
        */}
        <div
          className={`
            flex-1 relative overflow-hidden min-h-0
            ${mobileView === "map" ? "flex" : "hidden sm:flex"}
          `}
        >
          <PostMap
            posts={filtered}
            userLocation={userLocation}
            selectedId={selectedId}
            onSelectPost={handleSelectPost}
          />

          {/* Selected post overlay — rendered on top of the map */}
          {selectedPost && (
            <SelectedPostOverlay
              post={selectedPost}
              onClose={() => setSelectedId(null)}
              onClaim={handleClaim}
              claiming={claiming}
              canClaim={canClaim}
              isLoggedIn={isLoggedIn}
            />
          )}

          {/* Zero-posts hint (desktop only when map is showing) */}
          {!isLoading && filtered.length === 0 && !selectedPost && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg border border-slate-200 text-center">
                <p className="text-sm font-bold text-slate-700">
                  Niciun anunț disponibil
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Revino mai târziu sau postează tu sticle.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
