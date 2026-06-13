"use client";

import { useState, useCallback, useRef, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  FaWineBottle,
  FaMapMarkerAlt,
  FaPercent,
  FaCheckCircle,
  FaRegCompass,
} from "react-icons/fa";
import { FcIdea, FcHighPriority, FcBullish } from "react-icons/fc";
import {
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  X,
  Plus,
  Minus,
  AlertTriangle,
  Heart,
  Coins,
} from "lucide-react";
import { BOTTLE_PRESETS, RON_PER_BOTTLE } from "@/lib/validations/post";
import { showToast } from "@/lib/toast";
import useSWR from "swr";
import { useSetActiveCounts } from "@/hooks/useActiveCounts";
import { AiBottleAnalyzer } from "@/app/components/UI/AIBottleAnalyzer";

const API = process.env.NEXT_PUBLIC_API_VERSION ?? "v1";

interface FormData {
  bottleCount: number;
  collectorRonAmount: number;
  description: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string;
  address: string;
  phone: string;
  expiresInHours: number;
}

const INITIAL: FormData = {
  bottleCount: 0,
  collectorRonAmount: 0,
  description: "",
  latitude: null,
  longitude: null,
  locationName: "",
  address: "",
  phone: "",
  expiresInHours: 24,
};
interface GeocodeResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
  };
}

const PRESETS = BOTTLE_PRESETS.filter((p) => p.value > 0);

const EXPIRY_OPTIONS = [
  { h: 12, label: "12h" },
  { h: 24, label: "24h" },
  { h: 48, label: "48h" },
  { h: 72, label: "72h" },
];

const MIN_COLLECTOR_RON = 5;

function computeDefaultCollectorRON(bottleCount: number): number {
  const totalValue = bottleCount * RON_PER_BOTTLE;
  if (totalValue <= 0) return 0;
  const targetRON = Math.max(MIN_COLLECTOR_RON, totalValue * 0.3);
  const capped = Math.min(totalValue, targetRON);
  return Math.ceil(capped * 2) / 2;
}

const SLIDE_EASE = [0.22, 1, 0.36, 1] as const;

const stepVariants: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 56 : -56,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: SLIDE_EASE },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -56 : 56,
    opacity: 0,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
  }),
};

const fadeUp = {
  hidden: { opacity: 0, y: 6 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: SLIDE_EASE, delay: i * 0.045 },
  }),
};

function useLeaflet() {
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

  return ready;
}

const STEPS = [
  { label: "Cantitate", Icon: FaWineBottle },
  { label: "Locație", Icon: FaMapMarkerAlt },
  { label: "Detalii", Icon: FaPercent },
  { label: "Confirmare", Icon: FaCheckCircle },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-start justify-between w-full mb-8 px-4">
      {STEPS.map((step, idx) => {
        const done = idx < current;
        const active = idx === current;

        return (
          <Fragment key={idx}>
            <div className="flex flex-col items-center shrink-0 w-16">
              <motion.div
                initial={{
                  backgroundColor: "#ffffff",
                  borderColor: "#e2e8f0",
                  scale: 1,
                }}
                animate={{
                  scale: active ? 1.12 : 1,
                  backgroundColor: done
                    ? "#a3e635"
                    : active
                      ? "#123424"
                      : "#ffffff",
                  borderColor: done
                    ? "#a3e635"
                    : active
                      ? "#123424"
                      : "#e2e8f0",
                  color: done ? "#000" : active ? "#fff" : "#94a3b8",
                }}
                transition={{ duration: 0.3, ease: SLIDE_EASE }}
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 z-10"
              >
                <AnimatePresence mode="wait">
                  {done ? (
                    <motion.svg
                      key="check"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </motion.svg>
                  ) : (
                    <motion.span
                      key="num"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.7, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {idx + 1}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.span
                animate={{ color: active ? "#123424" : "#94a3b8" }}
                transition={{ duration: 0.25 }}
                className="mt-2 text-[10px] font-semibold text-center leading-tight"
              >
                {step.label}
              </motion.span>
            </div>

            {idx < STEPS.length - 1 && (
              <div className="flex-1 flex items-center h-9">
                <div className="relative w-full h-0.5 bg-slate-200 overflow-hidden rounded-full">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-lime-400 rounded-full"
                    animate={{ width: done ? "100%" : "0%" }}
                    transition={{ duration: 0.4, ease: SLIDE_EASE }}
                  />
                </div>
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function FieldLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-2.5">
      <p className="font-bold text-slate-800">{children}</p>
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function StepBottles({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (d: Partial<FormData>) => void;
}) {
  const [showAi, setShowAi] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const estimatedValue = parseFloat(
    (data.bottleCount * RON_PER_BOTTLE).toFixed(2),
  );

  const clamp = (n: number) => Math.max(0, Math.min(10_000, n));

  const applyCount = (fn: (prev: number) => number) => {
    const newVal = fn(data.bottleCount);
    onChange({
      bottleCount: newVal,
      collectorRonAmount: computeDefaultCollectorRON(newVal),
    });
  };

  const startPress = (dir: 1 | -1) => {
    const next1 = clamp(data.bottleCount + dir);
    onChange({
      bottleCount: next1,
      collectorRonAmount: computeDefaultCollectorRON(next1),
    });
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        applyCount((prev) => clamp(prev + dir));
      }, 80);
    }, 350);
  };

  const stopPress = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => () => stopPress(), []);

  return (
    <div className="space-y-6">
      <div>
        <FieldLabel>Câte sticle vei recicla?</FieldLabel>
        <div className="flex items-center gap-3 bg-slate-50 rounded-2xl border border-slate-200 p-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onPointerDown={() => startPress(-1)}
            onPointerUp={stopPress}
            onPointerLeave={stopPress}
            disabled={data.bottleCount <= 0}
            className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:border-slate-300 transition-colors disabled:opacity-30 cursor-pointer"
          >
            <Minus className="w-4 h-4 text-slate-600" />
          </motion.button>

          <input
            type="number"
            min={0}
            max={10000}
            value={data.bottleCount || ""}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              const newCount = isNaN(v) ? 0 : clamp(v);
              onChange({
                bottleCount: newCount,
                collectorRonAmount: computeDefaultCollectorRON(newCount),
              });
            }}
            placeholder="0"
            className="flex-1 text-center text-4xl font-black text-[#123424] bg-transparent outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onPointerDown={() => startPress(1)}
            onPointerUp={stopPress}
            onPointerLeave={stopPress}
            disabled={data.bottleCount >= 10_000}
            className="w-12 h-12 rounded-xl bg-[#123424] flex items-center justify-center hover:bg-[#1a4d36] transition-colors disabled:opacity-30 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-lime-400" />
          </motion.button>
        </div>

        <div className="mt-2 h-9 flex items-center justify-center">
          <div className="inline-flex items-center gap-1 rounded-full px-4 py-1.5">
            <span className="text-xs text-slate-500">
              {data.bottleCount} × 0,50 RON =
            </span>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={estimatedValue}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="text-sm font-black text-lime-700 font-mono"
              >
                {estimatedValue.toFixed(2)} RON
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((preset) => {
          const isActive = data.bottleCount === preset.value;
          return (
            <motion.button
              key={preset.value}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() =>
                onChange({
                  bottleCount: preset.value,
                  collectorRonAmount: computeDefaultCollectorRON(preset.value),
                })
              }
              initial={{ borderColor: "#f1f5f9", backgroundColor: "#ffffff" }}
              animate={{
                borderColor: isActive ? "#a3e635" : "#f1f5f9",
                backgroundColor: isActive ? "#f7fee7" : "#ffffff",
              }}
              transition={{ duration: 0.2 }}
              className="relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 cursor-pointer"
            >
              {preset.image && (
                <div className="w-16 h-16 relative shrink-0">
                  <Image
                    src={preset.image}
                    alt={preset.label}
                    fill
                    sizes="50px"
                    priority
                    className="object-contain"
                  />
                </div>
              )}
              <span
                className={`text-xs font-bold leading-tight text-center transition-colors ${isActive ? "text-lime-800" : "text-slate-700"}`}
              >
                {preset.label}
              </span>
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: SLIDE_EASE }}
                    className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-lime-400 flex items-center justify-center"
                  >
                    <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24">
                      <path
                        stroke="currentColor"
                        strokeWidth={3.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* ── AI Estimator button ── */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowAi(true)}
          className="w-full flex items-center justify-center gap-1 py-2.5 rounded-xl border-2 border-slate-100 text-slate-500 text-xs font-semibold hover:border-[#123424]/30 hover:text-[#123424] hover:bg-slate-50 transition-all cursor-pointer"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
            />
          </svg>
          Estimează cu AI printr-o fotografie
        </button>
      </div>

      {showAi && (
        <AiBottleAnalyzer
          onApply={(count) => {
            onChange({
              bottleCount: count,
              collectorRonAmount: computeDefaultCollectorRON(count),
            });
          }}
          onClose={() => setShowAi(false)}
        />
      )}
    </div>
  );
}

function StepLocation({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (d: Partial<FormData>) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const leafletReady = useLeaflet();

  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [searchQuery, setSearchQuery] = useState(data.locationName || "");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildIcon = () => {
    const L = window.L;
    return L.divIcon({
      className: "custom-map-pin",
      html: `<div style="position:relative;width:32px;height:32px;background-color:#f73138;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 5px rgba(0,0,0,0.3)"><div style="width:14px;height:14px;background-color:#fff;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(45deg)"></div></div>`,
      iconSize: [32, 44],
      iconAnchor: [16, 44],
    });
  };

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      setReverseLoading(true);
      try {
        const res = await fetch(
          `/api/${API}/geocode?type=reverse&lat=${lat}&lon=${lng}`,
        );
        const json = await res.json();
        const addr = json.address ?? {};
        const city =
          addr.city ?? addr.town ?? addr.village ?? addr.county ?? "";
        const road = addr.road ?? addr.neighbourhood ?? addr.suburb ?? "";
        const locationName = [road, city].filter(Boolean).join(", ");
        onChange({ locationName, address: json.display_name ?? "" });
        setSearchQuery(locationName || json.display_name?.split(",")[0] || "");
      } catch {
        /* non-fatal */
      } finally {
        setReverseLoading(false);
      }
    },
    [onChange],
  );

  const placeMarker = useCallback((lat: number, lng: number) => {
    const L = window.L;
    if (!L || !mapRef.current) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: buildIcon() }).addTo(
        mapRef.current,
      );
    }
    mapRef.current.setView([lat, lng], 16, { animate: true, duration: 0.6 });
  }, []);

  const setPin = useCallback(
    (lat: number, lng: number) => {
      onChange({ latitude: lat, longitude: lng });
      placeMarker(lat, lng);
      reverseGeocode(lat, lng);
    },
    [onChange, placeMarker, reverseGeocode],
  );

  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || mapRef.current) return;
    const L = window.L;
    const center: [number, number] =
      data.latitude && data.longitude
        ? [data.latitude, data.longitude]
        : [45.9432, 24.9668];

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: data.latitude ? 16 : 6,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) =>
      setPin(e.latlng.lat, e.latlng.lng),
    );
    mapRef.current = map;
    if (data.latitude && data.longitude)
      placeMarker(data.latitude, data.longitude);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [leafletReady]); // eslint-disable-line

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `/api/${API}/geocode?type=search&q=${encodeURIComponent(q)}`,
        );
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 450);
  };

  const handleSelectResult = (result: GeocodeResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const name = result.display_name.split(",").slice(0, 2).join(", ").trim();
    onChange({
      latitude: lat,
      longitude: lng,
      locationName: name,
      address: result.display_name,
    });
    setSearchQuery(name);
    setSearchResults([]);
    placeMarker(lat, lng);
  };

  const handleGPS = () => {
    if (!navigator.geolocation) {
      setGeoError("GPS-ul nu este suportat de browser.");
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPin(pos.coords.latitude, pos.coords.longitude);
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        setGeoError(
          err.code === 1
            ? "Permisiunea pentru locație a fost refuzată."
            : "Nu am putut determina locația.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>De unde vor fi preluate?</FieldLabel>
        <div className="relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="ex: Strada Victoriei, Cluj..."
                className="w-full pl-9 pr-8 py-3 h-12 rounded-xl border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-100 outline-none bg-white transition-shadow"
              />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
              )}
              {searchQuery && !searchLoading && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={handleGPS}
              disabled={geoLoading}
              className="w-12 h-12 rounded-xl border border-[#123424]/20 hover:bg-[#123424]/10 flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer shrink-0"
              title="Folosește GPS-ul"
            >
              {geoLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#123424]" />
              ) : (
                <FaRegCompass className="w-5 h-5 text-[#123424]" />
              )}
            </motion.button>
          </div>

          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="absolute top-full left-0 right-12 mt-1 bg-white rounded-xl border border-slate-200 z-[1002] overflow-hidden shadow-lg"
              >
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectResult(r)}
                    className="w-full text-left px-4 py-2.5 hover:bg-lime-50 transition-colors flex items-start gap-2.5 border-b border-slate-50 last:border-0 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700 line-clamp-1">
                      {r.display_name}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {geoError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-1.5 text-xs text-red-500 flex items-center gap-1"
            >
              <span>⚠</span> {geoError}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div>
        <div
          className="relative rounded-2xl overflow-hidden border-2 border-slate-200"
          style={{ height: 260 }}
        >
          <div ref={mapContainerRef} className="w-full h-full" />

          {!leafletReady && (
            <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          )}
          {reverseLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center z-10">
              <div className="bg-white rounded-xl px-4 py-2 shadow-md flex items-center gap-2 text-sm text-slate-600 font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-[#123424]" />
                Se obține adresa...
              </div>
            </div>
          )}
          {!data.latitude && leafletReady && (
            <div className="absolute bottom-3 inset-x-0 flex justify-center z-10 pointer-events-none">
              <div className="bg-black/65 backdrop-blur text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                Apasă pe hartă pentru a selecta locația
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {data.latitude && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.25, ease: SLIDE_EASE }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2.5 bg-lime-50 border border-lime-200 rounded-xl">
              <MapPin className="w-4 h-4 text-lime-600 shrink-0" />
              <p className="text-sm font-semibold text-lime-800 flex-1 truncate">
                {data.locationName ||
                  `${data.latitude.toFixed(5)}, ${data.longitude?.toFixed(5)}`}
              </p>
              <button
                type="button"
                onClick={() => {
                  onChange({
                    latitude: null,
                    longitude: null,
                    locationName: "",
                    address: "",
                  });
                  setSearchQuery("");
                  if (markerRef.current) {
                    markerRef.current.remove();
                    markerRef.current = null;
                  }
                }}
                className="w-5 h-5 rounded-full hover:bg-lime-200 flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3 text-lime-600" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepDetails({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (d: Partial<FormData>) => void;
  originalPhone: string | null;
}) {
  const estimatedValue = parseFloat(
    (data.bottleCount * RON_PER_BOTTLE).toFixed(2),
  );

  // Step size for slider snapping (in RON)
  let ronStep = 0.5;
  if (estimatedValue >= 50) ronStep = 1;
  if (estimatedValue > 100) ronStep = 2;
  if (estimatedValue > 200) ronStep = 5;
  if (estimatedValue > 500) ronStep = 10;

  // Source of truth: exact RON amounts (0.5 multiples)
  const collectorRON = parseFloat(
    Math.min(data.collectorRonAmount, estimatedValue).toFixed(2),
  );
  const posterRON = parseFloat((estimatedValue - collectorRON).toFixed(2));

  // Integer percentages — only for display and submission, never stored as float
  const displayCollectorPercent =
    estimatedValue > 0 ? Math.round((collectorRON / estimatedValue) * 100) : 0;
  const displayPosterPercent = 100 - displayCollectorPercent;

  // Slider tracks poster's share (lime side)
  const sliderValue =
    estimatedValue > 0 ? (posterRON / estimatedValue) * 100 : 50;

  const isGoodOffer =
    (collectorRON >= MIN_COLLECTOR_RON && displayCollectorPercent >= 30) ||
    (estimatedValue <= MIN_COLLECTOR_RON && collectorRON === estimatedValue);

  const getFeedbackMessage = () => {
    if (estimatedValue < 5) {
      return {
        key: "under-5",
        icon: <Coins className="w-5 h-5 text-amber-500" />,
        text: "Valoarea totală este sub 5 RON. Recomandat ar fi să donezi întreaga sumă colectorului, întrucât valoarea este prea mică pentru a fi împărțită.",
      };
    }
    if (displayCollectorPercent === 100) {
      return {
        key: "donation-100",
        icon: <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />,
        text: "Toate sticlele merg ca donație! Oferta este de nerefuzat pentru colectori, iar preluarea va fi foarte rapidă.",
      };
    }
    if (collectorRON < 5) {
      return {
        key: "low-offer",
        icon: <FcHighPriority className="w-5 h-5" />,
        text: "Suma oferită colectorului este prea mică. S-ar putea ca preluarea să dureze mai mult.",
      };
    }
    if (displayCollectorPercent >= 50) {
      return {
        key: "generous",
        icon: <FcBullish className="w-5 h-5" />,
        text: "Ești foarte generos! Suma oferită este atractivă și sigur va atrage colectorii din zonă.",
      };
    }
    if (isGoodOffer) {
      return {
        key: "good-offer",
        icon: <FcIdea className="w-5 h-5" />,
        text: "Ofertă foarte bună! Cu siguranță vei găsi un colector interesat de sticlele tale în scurt timp.",
      };
    }
    return {
      key: "low-offer",
      icon: <FcHighPriority className="w-5 h-5" />,
      text: "Suma oferită colectorului este prea mică. S-ar putea ca preluarea să dureze mai mult.",
    };
  };

  const feedback = getFeedbackMessage();

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (estimatedValue <= 0) return;
    const uiPercent = parseFloat(e.target.value); // poster's side

    if (uiPercent <= 0) {
      onChange({ collectorRonAmount: estimatedValue });
      return;
    }
    if (uiPercent >= 100) {
      onChange({ collectorRonAmount: 0 });
      return;
    }

    const targetPosterRON = (uiPercent / 100) * estimatedValue;
    let snappedPosterRON = Math.round(targetPosterRON / ronStep) * ronStep;

    if (targetPosterRON < ronStep / 2) {
      snappedPosterRON = 0;
    } else if (estimatedValue - targetPosterRON < ronStep / 2) {
      snappedPosterRON = estimatedValue;
    } else {
      const highestStep = Math.floor(estimatedValue / ronStep) * ronStep;
      if (snappedPosterRON > highestStep) {
        const midpoint = (highestStep + estimatedValue) / 2;
        snappedPosterRON =
          targetPosterRON >= midpoint ? estimatedValue : highestStep;
      }
    }

    const newCollectorRON = parseFloat(
      (estimatedValue - snappedPosterRON).toFixed(2),
    );
    onChange({
      collectorRonAmount: Math.max(
        0,
        Math.min(estimatedValue, newCollectorRON),
      ),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <FieldLabel>Cum vrei să împarți valoarea?</FieldLabel>
        <div className="mt-4">
          <div className="relative h-6 flex items-center mb-4">
            <div className="absolute w-full h-3 rounded-full overflow-hidden flex shadow-inner bg-slate-200">
              <div
                className="h-full bg-lime-400"
                style={{ width: `${sliderValue}%` }}
              />
              <div
                className="h-full bg-[#123424]"
                style={{ width: `${100 - sliderValue}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step="any"
              value={sliderValue}
              onChange={handleSliderChange}
              className="absolute w-full h-full appearance-none bg-transparent cursor-pointer z-10
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-6
                [&::-webkit-slider-thumb]:h-6
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:border-4
                [&::-webkit-slider-thumb]:border-[#123424]
                [&::-webkit-slider-thumb]:shadow-md"
            />
          </div>

          <div className="flex justify-between items-center mt-2">
            <div className="flex flex-col">
              <span className="text-[10px] tracking-wide text-slate-400 font-semibold">
                Partea ta
              </span>
              <span className="text-lg font-black text-lime-600">
                {displayPosterPercent}%
                <span className="ml-1 text-xs font-semibold text-lime-600/60">
                  ({posterRON.toFixed(2)} RON)
                </span>
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] tracking-wide text-slate-400 font-semibold">
                Partea colectorului
              </span>
              <span className="text-lg font-black text-[#123424]">
                {displayCollectorPercent}%{" "}
                <span className="ml-1 text-xs font-semibold text-slate-400">
                  ({collectorRON.toFixed(2)} RON)
                </span>
              </span>
            </div>
          </div>

          {/* feedback block — unchanged JSX, just uses updated `feedback` variable */}
          <div className="min-h-[60px] overflow-hidden w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={feedback.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="flex items-start gap-3 p-3 mt-3 rounded-xl bg-gray-50 border border-gray-100"
              >
                <div className="flex-shrink-0 mt-0.5">{feedback.icon}</div>
                <p className="text-sm font-medium text-gray-700 leading-relaxed">
                  {feedback.text}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div>
        <FieldLabel>Detalii suplimentare</FieldLabel>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="ex: Sticle PET și doze de aluminiu, la intrarea în bloc, scara A..."
          rows={3}
          maxLength={500}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-100 outline-none bg-white transition-shadow"
        />
        <p className="text-right text-[11px] text-slate-400 mt-1">
          {data.description.length} / 500
        </p>
      </div>

      <div>
        <FieldLabel hint="Opțional, vizibil doar colectorului">
          Telefon de contact
        </FieldLabel>
        <div className="relative">
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="+40 700 000 000"
            className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-100 outline-none bg-white transition-shadow"
          />
          {data.phone && (
            <button
              type="button"
              onClick={() => onChange({ phone: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Șterge numărul de telefon"
            >
              <X className="w-3 h-3 text-slate-500" />
            </button>
          )}
        </div>
      </div>
      <div>
        <FieldLabel>Cât timp vrei să fie valabil anunțul?</FieldLabel>
        <div className="grid grid-cols-4 gap-2">
          {EXPIRY_OPTIONS.map(({ h, label }) => {
            const active = data.expiresInHours === h;
            return (
              <button
                key={h}
                type="button"
                onClick={() => onChange({ expiresInHours: h })}
                style={{
                  backgroundColor: active ? "#123424" : "#ffffff",
                  borderColor: active ? "#123424" : "#e2e8f0",
                  color: active ? "#ffffff" : "#475569",
                }}
                className="py-3 rounded-xl border-2 text-sm font-bold cursor-pointer flex flex-col items-center gap-0.5"
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StepConfirm({
  data,
  error,
}: {
  data: FormData;
  submitting: boolean;
  error: string;
}) {
  const estimatedValue = parseFloat(
    (data.bottleCount * RON_PER_BOTTLE).toFixed(2),
  );
  const collectorEarning = parseFloat(
    Math.min(data.collectorRonAmount, estimatedValue).toFixed(2),
  );
  const posterEarning = parseFloat(
    (estimatedValue - collectorEarning).toFixed(2),
  );
  const collectorPercent =
    estimatedValue > 0
      ? Math.round((collectorEarning / estimatedValue) * 100)
      : 0;
  const posterPercent = 100 - collectorPercent;

  const rows: Array<{
    label: string;
    value: string;
    accent?: "green" | "lime" | "purple";
  }> = [
    { label: "Număr sticle", value: `${data.bottleCount} buc` },
    {
      label: "Valoare estimată SGR",
      value: `${estimatedValue.toFixed(2)} RON`,
    },
    {
      label: "Tu primești",
      value: `${posterEarning.toFixed(2)} RON (${posterPercent}%)`,
      accent: collectorPercent === 100 ? "green" : "lime",
    },
    {
      label: "Colectorul primește",
      value: `${collectorEarning.toFixed(2)} RON (${collectorPercent}%)`,
      accent: collectorPercent === 100 ? "purple" : "green",
    },
    { label: "Locație", value: data.locationName || "Coordonate setate" },
    ...(data.description
      ? [{ label: "Detalii", value: data.description }]
      : []),
    ...(data.phone ? [{ label: "Telefon", value: data.phone }] : []),
    { label: "Valabilitate", value: `${data.expiresInHours} ore` },
  ];

  return (
    <div>
      <FieldLabel>Rezumatul anunțului</FieldLabel>

      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        {rows.map(({ label, value, accent }, i) => (
          <motion.div
            key={label}
            custom={i}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className={`flex items-start justify-between gap-4 px-4 py-3 border-b border-slate-50 last:border-0 ${i % 2 === 1 ? "bg-slate-50/50" : "bg-white"}`}
          >
            <span className="text-sm text-slate-500 shrink-0">{label}</span>
            <span
              className={`text-sm font-semibold text-right break-words max-w-[55%]
                ${accent === "green" ? "text-[#123424]" : ""}
                ${accent === "lime" ? "text-lime-600" : ""}
                ${accent === "purple" ? "text-purple-600" : ""}
                ${!accent ? "text-slate-800" : ""}
              `}
            >
              {value}
            </span>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function ActivePostGuard({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useSWR(`/api/${API}/posts/active`, fetcher);

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (data?.activePost) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-amber-50 rounded-3xl p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-600 mb-4 mx-auto" />

          <h2 className="text-lg font-extrabold text-slate-900 mb-2">
            Ai deja un anunț activ
          </h2>
          <p className="text-sm text-slate-600 mb-5">
            Nu poți avea mai mult de un anunț activ. Finalizează sau anulează
            anunțul curent înainte de a crea unul nou.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href={`/post/${data.activePost.id}`}
              className="inline-flex items-center justify-center gap-2 bg-[#123424] text-white font-bold py-3 px-6 rounded-full hover:bg-[#1a4d36] transition-colors"
            >
              <FaWineBottle className="w-4 h-4 text-lime-400" />
              Vezi anunțul activ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function PostCreationClient({
  userPhone,
}: {
  userPhone: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [form, setForm] = useState<FormData>({
    ...INITIAL,
    phone: userPhone ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [originalPhone] = useState(userPhone);
  const setActiveCounts = useSetActiveCounts();

  const update = useCallback((partial: Partial<FormData>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  const canProceed = () => {
    if (step === 0) return form.bottleCount > 0;
    if (step === 1) return form.latitude !== null && form.longitude !== null;
    return true;
  };

  const handleNext = () => {
    if (canProceed()) {
      setDirection(1);
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const estimatedValue = parseFloat(
        (form.bottleCount * RON_PER_BOTTLE).toFixed(2),
      );

      const collectorSharePercent =
        estimatedValue > 0
          ? Math.round((form.collectorRonAmount / estimatedValue) * 100)
          : 0;

      const res = await fetch(`/api/${API}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bottleCount: form.bottleCount,
          estimatedValue,
          collectorSharePercent,
          description: form.description.trim(),
          latitude: form.latitude,
          longitude: form.longitude,
          locationName: form.locationName.trim() || null,
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          images: [],
          expiresInHours: form.expiresInHours,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "A apărut o eroare. Încearcă din nou.");
        setSubmitting(false);
        return;
      }

      const newPhone = form.phone.trim();
      if (newPhone !== (originalPhone ?? "")) {
        fetch(`/api/${API}/profile`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: newPhone || null }),
        }).catch(() => {});
      }

      showToast(
        "success",
        "Anunțul a fost publicat!",
        "Vei fi notificat atunci când un colector face o cerere.",
      );

      setActiveCounts({ activePosts: 1, activePostId: json.id });
      router.push(`/post/${json.id}`);
    } catch {
      setError("Eroare de rețea. Încearcă din nou.");
      setSubmitting(false);
    }
  };

  return (
    <ActivePostGuard>
      <div className="max-w-lg mx-auto px-4 py-8 min-h-[100dvh]">
        <StepIndicator current={step} />

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm shadow-slate-100/50 overflow-hidden mb-6">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <div className="p-6">
                {step === 0 && <StepBottles data={form} onChange={update} />}
                {step === 1 && <StepLocation data={form} onChange={update} />}
                {step === 2 && (
                  <StepDetails
                    data={form}
                    onChange={update}
                    originalPhone={originalPhone}
                  />
                )}
                {step === 3 && (
                  <StepConfirm
                    data={form}
                    submitting={submitting}
                    error={error}
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="space-y-2">
          <div className="flex gap-3">
            <AnimatePresence>
              {step > 0 && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22, ease: SLIDE_EASE }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleBack}
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-full border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:border-slate-300 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Înapoi
                </motion.button>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {step < STEPS.length - 1 ? (
                <motion.button
                  key="next"
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  whileTap={canProceed() ? { scale: 0.97 } : {}}
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-sm transition-all duration-200 ${
                    canProceed()
                      ? "bg-[#123424] text-white hover:bg-[#1a4d36] cursor-pointer"
                      : "bg-slate-100 text-slate-400 border-2 border-dashed border-slate-200 cursor-not-allowed"
                  }`}
                >
                  Continuă <ChevronRight className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.button
                  key="submit"
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-lime-400 text-black font-bold text-sm hover:bg-lime-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <AnimatePresence mode="wait">
                    {submitting ? (
                      <motion.span
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                        Se postează...
                      </motion.span>
                    ) : (
                      <motion.span
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 font-[800] tracking-wide"
                      >
                        <FaWineBottle className="w-4 h-4" />
                        Recash It!
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </ActivePostGuard>
  );
}
