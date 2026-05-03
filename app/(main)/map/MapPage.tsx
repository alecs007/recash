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
  SlidersHorizontal,
  Navigation,
  X,
  Star,
  Clock,
  ChevronRight,
  LayoutList,
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

// ─── Leaflet loader ───────────────────────────────────────────────────────────

function useLeaflet() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).L) {
      setReady(true);
      return;
    }

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    css.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    css.crossOrigin = "";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV/XN/WPaA=";
    script.crossOrigin = "";
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  return ready;
}

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  selected,
  onClick,
  onClaim,
  claiming,
  canClaim,
}: {
  post: Post;
  selected: boolean;
  onClick: () => void;
  onClaim: (id: string) => void;
  claiming: string | null;
  canClaim: boolean;
}) {
  const posterPercent = 100 - post.collectorSharePercent;
  const collectorPercent = post.collectorSharePercent;
  const timeLeft = post.expiresAt
    ? Math.max(
        0,
        Math.floor((new Date(post.expiresAt).getTime() - Date.now()) / 3600000),
      )
    : null;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border-2 p-4 cursor-pointer transition-all ${
        selected
          ? "border-lime-400 shadow-md shadow-lime-100"
          : "border-slate-100 hover:border-lime-200 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Author avatar */}
        <div className="w-10 h-10 rounded-full bg-lime-50 border border-lime-200 flex items-center justify-center overflow-hidden shrink-0">
          {post.author.image ? (
            <Image
              src={post.author.image}
              alt={post.author.name ?? ""}
              width={40}
              height={40}
              className="object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-lime-700">
              {post.author.name?.[0] ?? "?"}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm font-bold text-slate-900">
              {post.author.name ?? "Utilizator"}
            </span>
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-lime-400 fill-lime-400" />
              <span className="text-xs text-slate-500">
                {post.author.reputationScore.toFixed(1)}
              </span>
            </div>
          </div>

          {post.locationName && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500 truncate">
                {post.locationName}
              </span>
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 justify-end">
            <FaWineBottle className="w-3 h-3 text-lime-600" />
            <span className="text-lg font-black text-slate-900">
              {post.bottleCount}
            </span>
          </div>
          <div className="text-xs text-slate-400">sticle</div>
        </div>
      </div>

      {post.description && (
        <p className="text-xs text-slate-600 mt-2 line-clamp-2 italic">
          &quot;{post.description}&quot;
        </p>
      )}

      {/* Split info */}
      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-50">
        <div className="flex-1 text-xs text-slate-500">
          <span className="font-semibold text-[#123424]">
            {collectorPercent}%
          </span>{" "}
          pentru colector ·{" "}
          <span className="font-semibold text-slate-600">
            ~{((post.estimatedValue * collectorPercent) / 100).toFixed(2)} RON
          </span>
        </div>
        {timeLeft !== null && timeLeft < 12 && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <Clock className="w-3 h-3" />
            {timeLeft}h
          </div>
        )}
      </div>

      {/* Claim button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClaim(post.id);
        }}
        disabled={!canClaim || claiming === post.id}
        className="mt-3 w-full py-2 rounded-xl bg-[#123424] text-white text-xs font-bold hover:bg-[#1a4d36] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
      >
        {claiming === post.id ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <FaWineBottle className="w-3.5 h-3.5 text-lime-400" />
        )}
        Colectează
      </button>
    </div>
  );
}

// ─── Map component ────────────────────────────────────────────────────────────

function LeafletMap({
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
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, any>>({});
  const leafletReady = useLeaflet();

  // Init map
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: userLocation ?? [45.9432, 24.9668], // Romania center
      zoom: userLocation ? 13 : 7,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [leafletReady]); // eslint-disable-line

  // Update user location marker
  useEffect(() => {
    if (!mapRef.current || !userLocation || !(window as any).L) return;
    const L = (window as any).L;

    const pulseIcon = L.divIcon({
      className: "",
      html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    L.marker(userLocation, { icon: pulseIcon })
      .addTo(mapRef.current)
      .bindPopup("Locația ta");

    mapRef.current.setView(userLocation, 13);
  }, [userLocation]);

  // Update post markers
  useEffect(() => {
    if (!mapRef.current || !leafletReady || !(window as any).L) return;
    const L = (window as any).L;
    const map = mapRef.current;

    // Remove old markers
    Object.values(markersRef.current).forEach((m: any) => m.remove());
    markersRef.current = {};

    posts.forEach((post) => {
      const isSelected = post.id === selectedId;
      const bottles = post.bottleCount;
      const size = bottles >= 100 ? 44 : bottles >= 25 ? 38 : 32;
      const color = isSelected ? "#a3e635" : "#123424";
      const textColor = isSelected ? "#123424" : "white";

      const icon = L.divIcon({
        className: "",
        html: `
          <div style="
            width:${size}px;height:${size}px;border-radius:50%;
            background:${color};border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            font-weight:900;font-size:${size <= 32 ? "10" : "12"}px;
            color:${textColor};font-family:sans-serif;
            transition:all 0.2s;
            cursor:pointer;
          ">${bottles >= 1000 ? "1K+" : bottles}</div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([post.latitude, post.longitude], { icon })
        .addTo(map)
        .on("click", () => onSelectPost(post.id));

      markersRef.current[post.id] = marker;
    });
  }, [posts, selectedId, leafletReady, onSelectPost]);

  // Pan to selected post
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const post = posts.find((p) => p.id === selectedId);
    if (post) {
      mapRef.current.panTo([post.latitude, post.longitude], {
        animate: true,
        duration: 0.5,
      });
    }
  }, [selectedId, posts]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
      style={{ minHeight: 300 }}
    />
  );
}

// ─── Main Map Page ────────────────────────────────────────────────────────────

export default function MapPage() {
  const { data: session } = useSession();
  const { open: openAuthModal } = useAuthModal();
  const router = useRouter();

  const [view, setView] = useState<"split" | "list" | "map">("split");
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

  // Fetch all open posts
  const { data, isLoading, mutate } = useSWR<{ posts: Post[] }>(
    "/api/v1/posts?limit=100",
    fetcher,
    { refreshInterval: 30000 },
  );

  // Fetch user's active state (if logged in)
  const { data: activeData } = useSWR<ActiveData>(
    session?.user?.id ? "/api/v1/posts/active" : null,
    fetcher,
    { refreshInterval: 15000 },
  );

  const posts = data?.posts ?? [];

  // Filter posts
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

  const selectedPost = filtered.find((p) => p.id === selectedId) ?? null;

  const canClaim = !!session?.user?.id && !activeData?.activeCollection;

  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleClaim = useCallback(
    async (postId: string) => {
      if (!session?.user?.id) {
        openAuthModal();
        return;
      }

      if (activeData?.activeCollection) {
        setClaimError("Ai deja o colectare activă.");
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
          if (res.status === 409 && json.activeCollectionId) {
            setClaimError(
              "Ai deja o colectare activă. Finalizează-o mai întâi.",
            );
          } else {
            setClaimError(json.error ?? "Eroare la revendicare.");
          }
          setClaiming(null);
          return;
        }

        mutate();
        router.push(`/post/${postId}`);
      } catch {
        setClaimError("Eroare de rețea.");
        setClaiming(null);
      }
    },
    [session, activeData, mutate, router, openAuthModal],
  );

  const handleSelectPost = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2 max-w-7xl mx-auto">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută după locație sau autor..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-lime-400 focus:ring-2 focus:ring-lime-100 outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>

          {/* GPS */}
          <button
            onClick={handleGetLocation}
            disabled={geoLoading}
            title="Localizează-mă"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {geoLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            ) : (
              <Navigation className="w-4 h-4 text-[#123424]" />
            )}
          </button>

          {/* Filters */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`p-2 rounded-xl border transition-colors ${
              showFilters || minBottles > 0
                ? "border-lime-400 bg-lime-50 text-lime-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* View toggle */}
          <div className="hidden sm:flex items-center border border-slate-200 rounded-xl overflow-hidden">
            {(
              [
                { v: "split", Icon: LayoutList, label: "Split" },
                { v: "list", Icon: LayoutList, label: "Listă" },
                { v: "map", Icon: MapIcon, label: "Hartă" },
              ] as const
            ).map(({ v, Icon, label }) => (
              <button
                key={v}
                onClick={() => setView(v)}
                title={label}
                className={`p-2 transition-colors ${
                  view === v
                    ? "bg-[#123424] text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <label className="text-xs font-semibold text-slate-600">
                Minim sticle:
              </label>
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
            </div>
          </div>
        )}

        {/* Active collection warning */}
        {activeData?.activeCollection && session?.user?.id && (
          <div className="max-w-7xl mx-auto mt-2">
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <span className="text-xs text-amber-700 font-semibold">
                Ai o colectare activă în desfășurare
              </span>
              <Link
                href={`/post/${activeData.activeCollection.id}`}
                className="text-xs font-bold text-amber-700 underline flex items-center gap-1"
              >
                Vezi <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {claimError && (
          <div className="max-w-7xl mx-auto mt-2">
            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <span className="text-xs text-red-600 font-semibold">
                {claimError}
              </span>
              <button onClick={() => setClaimError(null)}>
                <X className="w-3.5 h-3.5 text-red-500" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Count bar ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-slate-50 px-5 py-1.5 flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium">
          {isLoading ? (
            "Se încarcă..."
          ) : (
            <>
              <span className="font-bold text-slate-700">
                {filtered.length}
              </span>{" "}
              anunțuri disponibile
            </>
          )}
        </span>
        {!session?.user?.id && (
          <button
            onClick={openAuthModal}
            className="text-xs font-semibold text-lime-700 hover:underline"
          >
            Autentifică-te pentru a colecta
          </button>
        )}
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">
        {/* List panel */}
        {view !== "map" && (
          <div
            className={`${
              view === "split" ? "w-full sm:w-96 shrink-0" : "w-full"
            } overflow-y-auto bg-slate-50 border-r border-slate-100`}
          >
            {isLoading ? (
              <div className="p-4 space-y-3 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl h-36 border border-slate-100"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <FaWineBottle className="w-7 h-7 text-slate-300" />
                </div>
                <p className="font-bold text-slate-700 mb-1">
                  Niciun anunț disponibil
                </p>
                <p className="text-sm text-slate-400">
                  {search || minBottles > 0
                    ? "Încearcă să schimbi filtrele."
                    : "Nu sunt anunțuri active în zonă."}
                </p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {filtered.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    selected={selectedId === post.id}
                    onClick={() => handleSelectPost(post.id)}
                    onClaim={handleClaim}
                    claiming={claiming}
                    canClaim={canClaim}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Map panel */}
        {view !== "list" && (
          <div className="flex-1 relative bg-slate-200 overflow-hidden">
            <LeafletMap
              posts={filtered}
              userLocation={userLocation}
              selectedId={selectedId}
              onSelectPost={handleSelectPost}
            />

            {/* Selected post popup overlay */}
            {selectedPost && view === "split" && (
              <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-[1000]">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-lime-50 border border-lime-200 flex items-center justify-center overflow-hidden shrink-0">
                        {selectedPost.author.image ? (
                          <Image
                            src={selectedPost.author.image}
                            alt={selectedPost.author.name ?? ""}
                            width={32}
                            height={32}
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-lime-700">
                            {selectedPost.author.name?.[0] ?? "?"}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {selectedPost.bottleCount} sticle
                        </p>
                        {selectedPost.locationName && (
                          <p className="text-xs text-slate-500">
                            {selectedPost.locationName}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedId(null)}
                      className="p-1 rounded-full hover:bg-slate-100"
                    >
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-3 text-xs text-slate-600">
                    <span>
                      <span className="font-bold text-lime-600">
                        {selectedPost.collectorSharePercent}%
                      </span>{" "}
                      ție ·{" "}
                      <span className="font-bold">
                        ~
                        {(
                          (selectedPost.estimatedValue *
                            selectedPost.collectorSharePercent) /
                          100
                        ).toFixed(2)}{" "}
                        RON
                      </span>
                    </span>
                  </div>

                  <button
                    onClick={() => handleClaim(selectedPost.id)}
                    disabled={!canClaim || claiming === selectedPost.id}
                    className="w-full py-2.5 rounded-xl bg-[#123424] text-white text-sm font-bold hover:bg-[#1a4d36] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {claiming === selectedPost.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : !session?.user?.id ? (
                      "Autentifică-te"
                    ) : (
                      <>
                        <FaWineBottle className="w-4 h-4 text-lime-400" />
                        Colectează acum
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Mobile: view as map only shows popup */}
            {selectedPost && view === "map" && (
              <div className="absolute bottom-4 left-4 right-4 z-[1000]">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-bold text-slate-900">
                        {selectedPost.bottleCount} sticle
                      </p>
                      {selectedPost.locationName && (
                        <p className="text-xs text-slate-500">
                          {selectedPost.locationName}
                        </p>
                      )}
                    </div>
                    <button onClick={() => setSelectedId(null)}>
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleClaim(selectedPost.id)}
                    disabled={!canClaim || claiming === selectedPost.id}
                    className="w-full py-2.5 rounded-xl bg-[#123424] text-white text-sm font-bold hover:bg-[#1a4d36] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {claiming === selectedPost.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <FaWineBottle className="w-4 h-4 text-lime-400" />
                        Colectează
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* No leaflet fallback */}
            {posts.length === 0 && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                <div className="text-center">
                  <MapIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Harta se încarcă...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
