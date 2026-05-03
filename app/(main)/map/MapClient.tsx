"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  Navigation,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Star,
  MapPin,
} from "lucide-react";
import { FaWineBottle } from "react-icons/fa";
import type * as L from "leaflet";

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
  address: string | null;
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

interface MapClientProps {
  userId: string | null;
  hasActiveCollection: boolean; // user is already a collector on a CLAIMED/IN_PROGRESS post
  hasActivePost: boolean; // user already has an OPEN/CLAIMED/IN_PROGRESS post as poster
}

// ─── Post Detail Card ─────────────────────────────────────────────────────────

function PostDetailCard({
  post,
  userId,
  hasActiveCollection,
  onClose,
  onClaim,
  isClaiming,
  claimError,
}: {
  post: Post;
  userId: string | null;
  hasActiveCollection: boolean;
  onClose: () => void;
  onClaim: () => void;
  isClaiming: boolean;
  claimError: string;
}) {
  const collectorEarning =
    (post.estimatedValue * post.collectorSharePercent) / 100;
  const posterEarning = post.estimatedValue - collectorEarning;
  const isDonation = post.collectorSharePercent === 100;
  const isOwnPost = userId === post.author.id;

  const expiresIn = post.expiresAt
    ? Math.max(
        0,
        Math.round((new Date(post.expiresAt).getTime() - Date.now()) / 3600000),
      )
    : null;

  return (
    <div className="mx-3 mb-3 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-lime-50 border border-lime-200 flex items-center justify-center overflow-hidden shrink-0">
            {post.author.image ? (
              <Image
                src={post.author.image}
                alt={post.author.name ?? ""}
                width={32}
                height={32}
                className="object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-lime-700">
                {post.author.name?.[0] ?? "?"}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-none">
              {post.author.name ?? "Utilizator"}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="w-3 h-3 text-lime-400 fill-lime-400" />
              <span className="text-xs text-slate-500">
                {post.author.reputationScore.toFixed(1)} (
                {post.author.ratingCount})
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Content */}
      <div className="px-5 pb-4">
        <p className="text-sm text-slate-700 line-clamp-2 mb-3">
          {post.description}
        </p>

        <div className="flex items-center gap-3 mb-3">
          {/* Bottle count */}
          <div className="flex-1 bg-slate-50 rounded-2xl px-3 py-2 flex items-center gap-2">
            <FaWineBottle className="w-4 h-4 text-[#123424]" />
            <div>
              <p className="text-xs text-slate-500">Sticle</p>
              <p className="font-black text-slate-900 text-base leading-none">
                {post.bottleCount}
              </p>
            </div>
          </div>
          {/* Earnings */}
          <div className="flex-1 bg-lime-50 rounded-2xl px-3 py-2">
            <p className="text-xs text-lime-700">Tu câștigi</p>
            <p className="font-black text-lime-700 text-xl leading-none">
              +{collectorEarning.toFixed(2)}{" "}
              <span className="text-sm font-semibold">RON</span>
            </p>
          </div>
          {/* Split */}
          <div className="flex-1 bg-slate-50 rounded-2xl px-3 py-2">
            <p className="text-xs text-slate-500">Împărțire</p>
            <p className="font-black text-slate-900 text-base leading-none">
              {isDonation
                ? "Donație"
                : `${post.collectorSharePercent}% / ${100 - post.collectorSharePercent}%`}
            </p>
          </div>
        </div>

        {/* Location */}
        {post.locationName && (
          <div className="flex items-center gap-1.5 mb-3 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{post.locationName}</span>
            {expiresIn !== null && (
              <>
                <span className="text-slate-300">·</span>
                <span
                  className={expiresIn < 2 ? "text-red-500 font-semibold" : ""}
                >
                  Expiră în {expiresIn}h
                </span>
              </>
            )}
          </div>
        )}

        {/* Images */}
        {post.images.length > 0 && (
          <div className="flex gap-2 mb-3">
            {post.images.slice(0, 3).map((img, i) => (
              <div
                key={i}
                className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200"
              >
                <Image
                  src={img}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {claimError && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold">
            {claimError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            href={`/post/${post.id}`}
            className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-700 font-semibold text-sm text-center hover:border-slate-300 transition-colors"
          >
            Detalii
          </Link>
          {!userId ? (
            <button
              onClick={() => (window.location.href = "/?auth=1")}
              className="flex-2 flex-1 py-3 rounded-2xl bg-[#123424] text-white font-bold text-sm text-center hover:bg-[#1a4d36] transition-colors"
            >
              Conectează-te
            </button>
          ) : isOwnPost ? (
            <div className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-400 font-semibold text-sm text-center">
              Anunțul tău
            </div>
          ) : hasActiveCollection ? (
            <div className="flex-1 py-3 rounded-2xl bg-amber-50 text-amber-700 font-semibold text-xs text-center border border-amber-200">
              Ai deja o colectare activă
            </div>
          ) : (
            <button
              onClick={onClaim}
              disabled={isClaiming}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-lime-400 text-black font-bold text-sm hover:bg-lime-300 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isClaiming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FaWineBottle className="w-4 h-4" />
              )}
              Colectează
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Bottom Stats Panel ────────────────────────────────────────────────────────

function BottomPanel({
  visiblePosts,
  totalEarnable,
  sliderIndex,
  setSliderIndex,
  onSelectPost,
  isLoadingPosts,
}: {
  visiblePosts: Post[];
  totalEarnable: number;
  sliderIndex: number;
  setSliderIndex: (i: number) => void;
  onSelectPost: (p: Post) => void;
  isLoadingPosts: boolean;
}) {
  if (visiblePosts.length === 0 && !isLoadingPosts) {
    return (
      <div className="mx-3 mb-3 bg-white/90 backdrop-blur rounded-3xl border border-slate-200 shadow-xl p-5 text-center">
        <FaWineBottle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-bold text-slate-500">
          Niciun anunț în această zonă
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Mișcă harta sau caută o altă locație
        </p>
      </div>
    );
  }

  const canPrev = sliderIndex > 0;
  const canNext = sliderIndex < visiblePosts.length - 1;

  return (
    <div className="mx-3 mb-3 bg-white/95 backdrop-blur rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
      {/* Stats row */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-slate-400 font-medium">
              Anunțuri vizibile
            </p>
            <p className="text-xl font-black text-slate-900 leading-none">
              {isLoadingPosts ? (
                <span className="inline-block w-8 h-5 bg-slate-100 animate-pulse rounded" />
              ) : (
                visiblePosts.length
              )}
            </p>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div>
            <p className="text-xs text-slate-400 font-medium">
              Profit total posibil
            </p>
            <p className="text-xl font-black text-lime-600 leading-none">
              {isLoadingPosts ? (
                <span className="inline-block w-20 h-5 bg-slate-100 animate-pulse rounded" />
              ) : (
                `+${totalEarnable.toFixed(2)} RON`
              )}
            </p>
          </div>
        </div>

        {visiblePosts.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSliderIndex(Math.max(0, sliderIndex - 1))}
              disabled={!canPrev}
              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:border-slate-300 disabled:opacity-30 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-xs text-slate-400 min-w-[40px] text-center">
              {sliderIndex + 1}/{visiblePosts.length}
            </span>
            <button
              onClick={() =>
                setSliderIndex(
                  Math.min(visiblePosts.length - 1, sliderIndex + 1),
                )
              }
              disabled={!canNext}
              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:border-slate-300 disabled:opacity-30 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        )}
      </div>

      {/* Slide area - horizontally scrollable post mini-cards */}
      <div className="px-4 py-3">
        {isLoadingPosts ? (
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-52 h-20 bg-slate-100 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 pb-1">
              {visiblePosts.map((post, idx) => {
                const earning =
                  (post.estimatedValue * post.collectorSharePercent) / 100;
                return (
                  <button
                    key={post.id}
                    onClick={() => {
                      setSliderIndex(idx);
                      onSelectPost(post);
                    }}
                    className={`flex-shrink-0 w-52 rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                      idx === sliderIndex
                        ? "border-lime-400 bg-lime-50"
                        : "border-slate-200 bg-white hover:border-lime-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700 line-clamp-2 flex-1 leading-snug">
                        {post.description}
                      </p>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-lime-600">
                          +{earning.toFixed(0)}
                        </p>
                        <p className="text-[10px] text-slate-400">RON</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <FaWineBottle className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        {post.bottleCount} sticle
                      </span>
                      {post.locationName && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-400 truncate max-w-[80px]">
                            {post.locationName}
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MapClient({
  userId,
  hasActiveCollection,
  hasActivePost,
}: MapClientProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const leafletRef = useRef<typeof L | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [visiblePosts, setVisiblePosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [sliderIndex, setSliderIndex] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  // ── Fetch posts ────────────────────────────────────────────────────────────

  const fetchPosts = useCallback(
    async (lat: number, lng: number, radius: number) => {
      setIsLoadingPosts(true);
      try {
        const res = await fetch(
          `/api/v1/posts?lat=${lat}&lng=${lng}&radius=${Math.min(50, radius)}&limit=100`,
        );
        const data = await res.json();
        setPosts(data.posts ?? []);
      } catch {
        // ignore
      } finally {
        setIsLoadingPosts(false);
      }
    },
    [],
  );

  // ── Update visible posts based on current map bounds ───────────────────────

  const updateVisible = useCallback((mapInstance: any, allPosts: Post[]) => {
    if (!mapInstance) return;
    const bounds = mapInstance.getBounds();
    const visible = allPosts.filter((p) =>
      bounds.contains([p.latitude, p.longitude]),
    );
    setVisiblePosts(visible.slice(0, 10));
  }, []);

  // ── Initialize Leaflet map ─────────────────────────────────────────────────

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Inject Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Inject scrollbar-hide util
    if (!document.getElementById("map-styles")) {
      const style = document.createElement("style");
      style.id = "map-styles";
      style.textContent = `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .leaflet-control-zoom { margin-bottom: 100px !important; }
      `;
      document.head.appendChild(style);
    }

    import("leaflet").then((L) => {
      if (mapInstanceRef.current) return;

      leafletRef.current = L;

      const map = L.map(mapContainerRef.current!, {
        center: [45.9432, 24.9668],
        zoom: 8,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);

      L.control
        .attribution({ position: "bottomleft", prefix: false })
        .addAttribution(
          "© <a href='https://openstreetmap.org'>OpenStreetMap</a>",
        )
        .addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);

      // On move: re-fetch and update visible
      map.on("moveend zoomend", () => {
        const center = map.getCenter();
        const bounds = map.getBounds();
        const ne = bounds.getNorthEast();
        const radius = center.distanceTo(ne) / 1000;
        fetchPosts(center.lat, center.lng, radius);
      });

      // Deselect on map click
      map.on("click", () => {
        setSelectedPost(null);
        setClaimError("");
      });

      // Initial fetch
      const center = map.getCenter();
      fetchPosts(center.lat, center.lng, 50);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update markers whenever posts change ───────────────────────────────────

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map || !mapReady) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    posts.forEach((post) => {
      const collectorEarning = (
        (post.estimatedValue * post.collectorSharePercent) /
        100
      ).toFixed(0);

      const isSelected = selectedPost?.id === post.id;

      const pinHtml = `
        <div style="
          background:${isSelected ? "#123424" : "white"};
          border:2px solid ${isSelected ? "#a3e635" : "#123424"};
          border-radius:14px;
          padding:5px 10px;
          box-shadow:0 4px 16px rgba(0,0,0,0.18);
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:1px;
          cursor:pointer;
          white-space:nowrap;
          position:relative;
        ">
          <span style="font-weight:800;font-size:11px;color:${isSelected ? "#a3e635" : "#123424"};">
            🍾 ${post.bottleCount}
          </span>
          <span style="font-weight:700;font-size:12px;color:${isSelected ? "white" : "#65a30d"};">
            +${collectorEarning} RON
          </span>
          <div style="
            position:absolute;
            bottom:-8px;
            left:50%;
            transform:translateX(-50%);
            width:0;height:0;
            border-left:7px solid transparent;
            border-right:7px solid transparent;
            border-top:8px solid ${isSelected ? "#a3e635" : "#123424"};
          "></div>
        </div>
      `;

      const icon = L.divIcon({
        className: "",
        html: pinHtml,
        iconAnchor: [45, 58],
        iconSize: [90, 58],
      });

      const marker = L.marker([post.latitude, post.longitude], { icon })
        .addTo(map)
        .on("click", (e: any) => {
          e.originalEvent.stopPropagation();
          setSelectedPost(post);
          setClaimError("");
        });

      markersRef.current.set(post.id, marker);
    });

    // Update visible
    updateVisible(map, posts);
  }, [posts, selectedPost, mapReady, updateVisible]);

  // ── Search ─────────────────────────────────────────────────────────────────

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim() || !mapInstanceRef.current) return;
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            searchQuery,
          )}&format=json&limit=1&countrycodes=ro`,
          { headers: { "Accept-Language": "ro" } },
        );
        const results = await res.json();
        if (results.length > 0) {
          const { lat, lon } = results[0];
          mapInstanceRef.current.setView(
            [parseFloat(lat), parseFloat(lon)],
            13,
          );
        }
      } finally {
        setIsSearching(false);
      }
    },
    [searchQuery],
  );

  // ── Locate device ──────────────────────────────────────────────────────────

  const handleLocate = useCallback(() => {
    if (!mapInstanceRef.current) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapInstanceRef.current!.setView(
          [pos.coords.latitude, pos.coords.longitude],
          14,
        );
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // ── Claim ──────────────────────────────────────────────────────────────────

  const handleClaim = useCallback(async () => {
    if (!selectedPost || !userId) return;
    setIsClaiming(true);
    setClaimError("");
    try {
      const res = await fetch(`/api/v1/posts/${selectedPost.id}/claim`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setClaimError(json.error ?? "Eroare la revendicare.");
      } else {
        window.location.href = `/post/${selectedPost.id}`;
      }
    } catch {
      setClaimError("Eroare de rețea. Încearcă din nou.");
    } finally {
      setIsClaiming(false);
    }
  }, [selectedPost, userId]);

  // ── Computed stats ─────────────────────────────────────────────────────────

  const totalEarnable = visiblePosts.reduce(
    (sum, p) => sum + (p.estimatedValue * p.collectorSharePercent) / 100,
    0,
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: "fixed",
        top: "64px", // header height (h-16)
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
      }}
    >
      {/* Map */}
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* ── Search bar ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          width: "min(92%, 520px)",
        }}
      >
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white/95 backdrop-blur border border-slate-200 rounded-2xl px-4 shadow-xl">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută un oraș, stradă sau zonă..."
              className="flex-1 py-3.5 text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="bg-[#123424] text-white px-4 rounded-2xl shadow-xl hover:bg-[#1a4d36] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>

      {/* ── Locate button ─────────────────────────────────────────── */}
      <button
        onClick={handleLocate}
        disabled={isLocating}
        style={{
          position: "absolute",
          top: "80px",
          right: "16px",
          zIndex: 1000,
        }}
        className="bg-white/95 backdrop-blur border border-slate-200 rounded-2xl p-3 shadow-xl hover:bg-white hover:border-slate-300 transition-all disabled:opacity-50 cursor-pointer"
        title="Localizează-mă"
      >
        {isLocating ? (
          <Loader2 className="w-5 h-5 text-[#123424] animate-spin" />
        ) : (
          <Navigation className="w-5 h-5 text-[#123424]" />
        )}
      </button>

      {/* ── Poster constraint notice ───────────────────────────────── */}
      {hasActivePost && userId && (
        <div
          style={{
            position: "absolute",
            top: "80px",
            left: "16px",
            zIndex: 1000,
          }}
          className="bg-amber-50/95 backdrop-blur border border-amber-200 rounded-2xl px-3 py-2 shadow-lg"
        >
          <p className="text-xs font-semibold text-amber-700">
            Ai un anunț activ —{" "}
            <Link href="/profil/postari" className="underline">
              vezi postările
            </Link>
          </p>
        </div>
      )}

      {/* ── Bottom panel ──────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        {selectedPost ? (
          <PostDetailCard
            post={selectedPost}
            userId={userId}
            hasActiveCollection={hasActiveCollection}
            onClose={() => {
              setSelectedPost(null);
              setClaimError("");
            }}
            onClaim={handleClaim}
            isClaiming={isClaiming}
            claimError={claimError}
          />
        ) : (
          <BottomPanel
            visiblePosts={visiblePosts}
            totalEarnable={totalEarnable}
            sliderIndex={sliderIndex}
            setSliderIndex={setSliderIndex}
            onSelectPost={(p) => {
              setSelectedPost(p);
              setClaimError("");
            }}
            isLoadingPosts={isLoadingPosts}
          />
        )}
      </div>
    </div>
  );
}
