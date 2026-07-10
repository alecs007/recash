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
  FaKey,
  FaExclamationTriangle,
  FaInfinity,
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
import { scrollToTop } from "@/app/components/UX/SmoothScroll";
import { createPortal } from "react-dom";
import { useI18n } from "@/context/I18nContext";

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
  expiresInHours: number | null;
  availabilitySchedule: { day: number; start: string; end: string }[] | null;
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
  expiresInHours: 48,
  availabilitySchedule: null,
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

const EXPIRY_OPTIONS: { h: number | null; label: { ro: string; en: string } }[] =
  [
    { h: 12, label: { ro: "12h", en: "12h" } },
    { h: 24, label: { ro: "24h", en: "24h" } },
    { h: 48, label: { ro: "48h", en: "48h" } },
    { h: 72, label: { ro: "72h", en: "72h" } },
    { h: 168, label: { ro: "1 săpt.", en: "1 wk" } },
    { h: 336, label: { ro: "2 săpt.", en: "2 wk" } },
    { h: 720, label: { ro: "1 lună", en: "1 mo" } },
    { h: null, label: { ro: "Nelimitat", en: "Unlimited" } },
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
  { label: { ro: "Cantitate", en: "Quantity" }, Icon: FaWineBottle },
  { label: { ro: "Locație", en: "Location" }, Icon: FaMapMarkerAlt },
  { label: { ro: "Detalii", en: "Details" }, Icon: FaPercent },
  { label: { ro: "Confirmare", en: "Confirm" }, Icon: FaCheckCircle },
];

function StepIndicator({ current }: { current: number }) {
  const { t } = useI18n();
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
                {t(step.label)}
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
  const { t, fmt } = useI18n();
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
        <FieldLabel>
          {t({
            ro: "Câte sticle vei recicla?",
            en: "How many bottles will you recycle?",
          })}
        </FieldLabel>
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
              {data.bottleCount} × {fmt(RON_PER_BOTTLE)} =
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
                {fmt(estimatedValue)}
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
                {preset.value === 0
                  ? t({ ro: "Altul", en: "Other" })
                  : t({
                      ro: `~${preset.value} sticle`,
                      en: `~${preset.value} bottles`,
                    })}
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
          className="w-full flex items-center justify-center gap-1 py-2.5 rounded-xl border-2 border-slate-100 text-slate-500 text-xs font-semibold hover:text-[#123424] hover:bg-slate-50 transition-all cursor-pointer"
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
          {t({
            ro: "Estimează cu AI printr-o fotografie",
            en: "Estimate with AI from a photo",
          })}
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
  const { t } = useI18n();
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
      setGeoError(
        t({
          ro: "GPS-ul nu este suportat de browser.",
          en: "GPS is not supported by your browser.",
        }),
      );
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
            ? t({
                ro: "Permisiunea pentru locație a fost refuzată.",
                en: "Location permission was denied.",
              })
            : t({
                ro: "Nu am putut determina locația.",
                en: "We couldn't determine your location.",
              }),
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>
          {t({
            ro: "De unde vor fi preluate?",
            en: "Where will they be picked up?",
          })}
        </FieldLabel>
        <div className="relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t({
                  ro: "ex: Strada Victoriei, Cluj...",
                  en: "e.g. Victoriei Street, Cluj...",
                })}
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
              title={t({ ro: "Folosește GPS-ul", en: "Use GPS" })}
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
                {t({ ro: "Se obține adresa...", en: "Getting the address..." })}
              </div>
            </div>
          )}
          {!data.latitude && leafletReady && (
            <div className="absolute bottom-3 inset-x-0 flex justify-center z-10 pointer-events-none">
              <div className="bg-black/65 backdrop-blur text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                {t({
                  ro: "Apasă pe hartă pentru a selecta locația",
                  en: "Tap the map to select the location",
                })}
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
  const { t, fmt } = useI18n();
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
        text: t({
          ro: `Valoarea totală este sub ${fmt(5)}. Recomandat ar fi să donezi întreaga sumă colectorului, întrucât valoarea este prea mică pentru a fi împărțită.`,
          en: `The total value is under ${fmt(5)}. We recommend donating the whole amount to the collector, since it's too small to split.`,
        }),
      };
    }
    if (displayCollectorPercent === 100) {
      return {
        key: "donation-100",
        icon: <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />,
        text: t({
          ro: "Toate sticlele merg ca donație! Oferta este de nerefuzat pentru colectori, iar preluarea va fi foarte rapidă.",
          en: "All the bottles go as a donation! It's an offer collectors can't refuse and pickup will be very fast.",
        }),
      };
    }
    if (collectorRON < 5) {
      return {
        key: "low-offer",
        icon: <FcHighPriority className="w-5 h-5" />,
        text: t({
          ro: "Suma oferită colectorului este prea mică. S-ar putea ca preluarea să dureze mai mult.",
          en: "The amount offered to the collector is too small. Pickup might take longer.",
        }),
      };
    }
    if (displayCollectorPercent >= 50) {
      return {
        key: "generous",
        icon: <FcBullish className="w-5 h-5" />,
        text: t({
          ro: "Ești foarte generos! Suma oferită este atractivă și sigur va atrage colectorii din zonă.",
          en: "Very generous! The amount is attractive and will surely draw collectors nearby.",
        }),
      };
    }
    if (isGoodOffer) {
      return {
        key: "good-offer",
        icon: <FcIdea className="w-5 h-5" />,
        text: t({
          ro: "Ofertă foarte bună! Cu siguranță vei găsi un colector interesat de sticlele tale în scurt timp.",
          en: "Great offer! You'll surely find an interested collector soon.",
        }),
      };
    }
    return {
      key: "low-offer",
      icon: <FcHighPriority className="w-5 h-5" />,
      text: t({
        ro: "Suma oferită colectorului este prea mică. S-ar putea ca preluarea să dureze mai mult.",
        en: "The amount offered to the collector is too small. Pickup might take longer.",
      }),
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
        <FieldLabel>
          {t({
            ro: "Cum vrei să împarți valoarea?",
            en: "How do you want to split the value?",
          })}
        </FieldLabel>
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
                {t({ ro: "Partea ta", en: "Your share" })}
              </span>
              <span className="text-lg font-black text-lime-600">
                {displayPosterPercent}%
                <span className="ml-1 text-xs font-semibold text-lime-600/60">
                  ({fmt(posterRON)})
                </span>
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] tracking-wide text-slate-400 font-semibold">
                {t({ ro: "Partea colectorului", en: "Collector's share" })}
              </span>
              <span className="text-lg font-black text-[#123424]">
                {displayCollectorPercent}%{" "}
                <span className="ml-1 text-xs font-semibold text-slate-400">
                  ({fmt(collectorRON)})
                </span>
              </span>
            </div>
          </div>

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
        <FieldLabel>
          {t({ ro: "Detalii suplimentare", en: "Additional details" })}
        </FieldLabel>

        {(() => {
          const SENSITIVE_PATTERN =
            /(\b[\w.-]+@[\w.-]+\.\w{2,}\b)|((https?:\/\/|www\.)\S+)|(\b(\+4|0)[\d\s\-().]{8,}\b)/i;
          const hasSensitive = SENSITIVE_PATTERN.test(data.description);

          const appendChip = (chip: string) => {
            const sep =
              data.description && !data.description.endsWith(" ") ? " " : "";
            const next = (data.description + sep + chip + ".")
              .trim()
              .slice(0, 500);
            if (!SENSITIVE_PATTERN.test(next)) onChange({ description: next });
          };

          return (
            <>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {[
                  { ro: "Cantitate aproximativă", en: "Approximate quantity" },
                  { ro: "La intrarea în bloc", en: "At the building entrance" },
                  { ro: "Sticle curate", en: "Clean bottles" },
                  { ro: "Se pot duce cu mâna", en: "Can be carried by hand" },
                  { ro: "Este nevoie de mașină", en: "A car is needed" },
                  { ro: "Sunt puse în saci", en: "Packed in bags" },
                ].map((chip) => {
                  const label = t(chip);
                  return (
                    <button
                      key={chip.en}
                      type="button"
                      onClick={() => appendChip(label)}
                      className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 hover:border-lime-400 hover:bg-lime-50 hover:text-lime-800 transition-all cursor-pointer"
                    >
                      + {label}
                    </button>
                  );
                })}
              </div>

              <div className="relative">
                <textarea
                  value={data.description}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange({ description: val });
                  }}
                  placeholder={t({
                    ro: "ex: Sticle PET și doze de aluminiu, la intrarea în bloc, scara A...",
                    en: "e.g. PET bottles and aluminium cans, at the building entrance, stairwell A...",
                  })}
                  rows={3}
                  maxLength={500}
                  className={`w-full px-4 py-3 pb-6 rounded-xl border focus:ring-2 outline-none bg-white transition-shadow ${
                    hasSensitive
                      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                      : "border-slate-200 focus:border-lime-400 focus:ring-lime-100"
                  }`}
                />
                <span className="absolute -bottom-4 right-3 text-[11px] text-slate-400 pointer-events-none">
                  {data.description.length} / 500
                </span>
              </div>

              <AnimatePresence>
                {hasSensitive && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden text-xs text-red-500 font-medium mt-5 flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {t({
                      ro: "Descrierea nu poate conține numere de telefon, adrese de email sau linkuri.",
                      en: "The description can't contain phone numbers, email addresses or links.",
                    })}
                  </motion.p>
                )}
              </AnimatePresence>
            </>
          );
        })()}
      </div>

      <div>
        <FieldLabel
          hint={t({
            ro: "Opțional, vizibil doar colectorului",
            en: "Optional, visible only to the collector",
          })}
        >
          {t({ ro: "Telefon de contact", en: "Contact phone" })}
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
              aria-label={t({
              ro: "Șterge numărul de telefon",
              en: "Clear phone number",
            })}
            >
              <X className="w-3 h-3 text-slate-500" />
            </button>
          )}
        </div>
      </div>
      <div>
        <FieldLabel>
          {t({
            ro: "Cât timp vrei să fie valabil anunțul?",
            en: "How long should the listing stay active?",
          })}
        </FieldLabel>
        <div className="grid grid-cols-4 gap-2">
          {EXPIRY_OPTIONS.map(({ h, label }) => {
            const active = data.expiresInHours === h;
            return (
              <button
                key={String(h)}
                type="button"
                onClick={() => onChange({ expiresInHours: h })}
                style={{
                  backgroundColor: active ? "#123424" : "#ffffff",
                  borderColor: active ? "#123424" : "#e2e8f0",
                  color: active ? "#ffffff" : "#475569",
                }}
                className="py-3 rounded-xl border-2 text-sm font-bold cursor-pointer flex items-center justify-center"
              >
                {h === null ? (
                  <>
                    <FaInfinity className="w-4 h-4 sm:hidden" />
                    <span className="hidden sm:inline">{t(label)}</span>
                  </>
                ) : (
                  t(label)
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Availability Picker ── */}
      <div>
        <div className="flex items-center justify-between py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <p className="text-sm font-bold text-slate-800">
              {t({
                ro: "Program de disponibilitate",
                en: "Availability schedule",
              })}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 mr-2">
              {data.availabilitySchedule
                ? t({
                    ro: "Anunțul este disponibil doar în intervalele selectate",
                    en: "The listing is available only during the selected time slots",
                  })
                : t({
                    ro: "Anunțul este disponibil oricând",
                    en: "The listing is available anytime",
                  })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (data.availabilitySchedule) {
                onChange({ availabilitySchedule: null });
              } else {
                onChange({
                  availabilitySchedule: [1, 2, 3, 4, 5].map((day) => ({
                    day,
                    start: "09:00",
                    end: "18:00",
                  })),
                });
              }
            }}
            className={`relative w-11 h-6 rounded-full transition-colors duration-300 cursor-pointer focus:outline-none shrink-0 ${
              data.availabilitySchedule ? "bg-lime-400" : "bg-slate-200"
            }`}
          >
            <motion.div
              animate={{ x: data.availabilitySchedule ? 22 : 6 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
            />
          </button>
        </div>

        <AnimatePresence>
          {data.availabilitySchedule && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3">
                {/* Day toggles */}
                <div className="grid grid-cols-7 gap-1.5">
                  {[
                    { value: 1, short: t({ ro: "L", en: "Mo" }) },
                    { value: 2, short: t({ ro: "Ma", en: "Tu" }) },
                    { value: 3, short: t({ ro: "Mi", en: "We" }) },
                    { value: 4, short: t({ ro: "J", en: "Th" }) },
                    { value: 5, short: t({ ro: "V", en: "Fr" }) },
                    { value: 6, short: t({ ro: "S", en: "Sa" }) },
                    { value: 0, short: t({ ro: "D", en: "Su" }) },
                  ].map(({ value, short }) => {
                    const active = data.availabilitySchedule!.some(
                      (s) => s.day === value,
                    );
                    return (
                      <motion.button
                        key={value}
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          const cur = data.availabilitySchedule!;
                          if (active) {
                            const updated = cur.filter((s) => s.day !== value);
                            onChange({
                              availabilitySchedule: updated.length
                                ? updated
                                : null,
                            });
                          } else {
                            onChange({
                              availabilitySchedule: [
                                ...cur,
                                { day: value, start: "09:00", end: "18:00" },
                              ],
                            });
                          }
                        }}
                        className={`aspect-square w-full rounded-xl text-xs sm:text-sm font-black border-2 cursor-pointer transition-colors flex items-center justify-center ${
                          active
                            ? "bg-[#123424] border-[#123424] text-white"
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {short}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Time ranges */}
                {[1, 2, 3, 4, 5, 6, 0]
                  .map((v) =>
                    data.availabilitySchedule!.find((s) => s.day === v),
                  )
                  .filter(Boolean)
                  .map((s) => {
                    const dayLabel = [
                      { value: 1, long: t({ ro: "Luni", en: "Monday" }) },
                      { value: 2, long: t({ ro: "Marți", en: "Tuesday" }) },
                      { value: 3, long: t({ ro: "Miercuri", en: "Wednesday" }) },
                      { value: 4, long: t({ ro: "Joi", en: "Thursday" }) },
                      { value: 5, long: t({ ro: "Vineri", en: "Friday" }) },
                      { value: 6, long: t({ ro: "Sâmbătă", en: "Saturday" }) },
                      { value: 0, long: t({ ro: "Duminică", en: "Sunday" }) },
                    ].find((d) => d.value === s!.day)?.long;
                    return (
                      <div
                        key={s!.day}
                        className="flex items-center gap-2 bg-slate-50 rounded-xl px-2.5 py-2"
                      >
                        <span className="text-xs font-bold text-slate-600 w-9 shrink-0">
                          {dayLabel?.slice(0, 3)}
                        </span>
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <input
                            type="time"
                            value={s!.start}
                            onChange={(e) => {
                              onChange({
                                availabilitySchedule:
                                  data.availabilitySchedule!.map((item) =>
                                    item.day === s!.day
                                      ? { ...item, start: e.target.value }
                                      : item,
                                  ),
                              });
                            }}
                            className="flex-1 min-w-0 text-xs sm:text-sm border border-slate-200 rounded-lg px-1.5 py-1 focus:border-lime-400 outline-none"
                          />
                          <span className="text-slate-400 text-xs shrink-0">
                            –
                          </span>
                          <input
                            type="time"
                            value={s!.end}
                            onChange={(e) => {
                              onChange({
                                availabilitySchedule:
                                  data.availabilitySchedule!.map((item) =>
                                    item.day === s!.day
                                      ? { ...item, end: e.target.value }
                                      : item,
                                  ),
                              });
                            }}
                            className="flex-1 min-w-0 text-xs sm:text-sm border border-slate-200 rounded-lg px-1.5 py-1 focus:border-lime-400 outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
  const { t, fmt } = useI18n();
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
    value: React.ReactNode;
    accent?: "green" | "lime" | "purple";
  }> = [
    {
      label: t({ ro: "Număr sticle", en: "Number of bottles" }),
      value: `${data.bottleCount} ${t({ ro: "buc", en: "pcs" })}`,
    },
    {
      label: t({ ro: "Valoare estimată SGR", en: "Estimated SGR value" }),
      value: fmt(estimatedValue),
    },
    {
      label: t({ ro: "Tu primești", en: "You get" }),
      value: `${fmt(posterEarning)} (${posterPercent}%)`,
      accent: collectorPercent === 100 ? "green" : "lime",
    },
    {
      label: t({ ro: "Colectorul primește", en: "The collector gets" }),
      value: `${fmt(collectorEarning)} (${collectorPercent}%)`,
      accent: collectorPercent === 100 ? "purple" : "green",
    },
    {
      label: t({ ro: "Locație", en: "Location" }),
      value:
        data.locationName ||
        t({ ro: "Coordonate setate", en: "Coordinates set" }),
    },
    ...(data.description
      ? [{ label: t({ ro: "Detalii", en: "Details" }), value: data.description }]
      : []),
    ...(data.phone
      ? [{ label: t({ ro: "Telefon", en: "Phone" }), value: data.phone }]
      : []),
    {
      label: t({ ro: "Valabilitate", en: "Validity" }),
      value:
        data.expiresInHours === null
          ? t({ ro: "Nelimitată", en: "Unlimited" })
          : (() => {
              const opt = EXPIRY_OPTIONS.find(
                (o) => o.h === data.expiresInHours,
              );
              return opt
                ? t(opt.label)
                : `${data.expiresInHours} ${t({ ro: "ore", en: "hours" })}`;
            })(),
    },
    ...(data.availabilitySchedule?.length
      ? [
          {
            label: t({ ro: "Program", en: "Schedule" }),
            value: (
              <div className="flex flex-col items-end gap-1.5">
                {data.availabilitySchedule
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
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <FieldLabel>
        {t({ ro: "Rezumatul anunțului", en: "Listing summary" })}
      </FieldLabel>

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
            <div
              className={`text-sm font-semibold text-right break-words max-w-[55%]
                ${accent === "green" ? "text-[#123424]" : ""}
                ${accent === "lime" ? "text-lime-600" : ""}
                ${accent === "purple" ? "text-purple-600" : ""}
                ${!accent ? "text-slate-800" : ""}
              `}
            >
              {value}
            </div>
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
  const { t } = useI18n();
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
        <div className="bg-slate-50 rounded-3xl p-8 flex flex-col items-center text-center">
          <Image
            src="/images/bottle-angry.svg"
            alt={t({ ro: "Anunț activ", en: "Active listing" })}
            width={160}
            height={160}
            priority
            draggable={false}
          />

          <h2 className="text-lg font-extrabold text-slate-900 mb-2">
            {t({
              ro: "Ai deja un anunț activ",
              en: "You already have an active listing",
            })}
          </h2>
          <p className="text-sm text-slate-600 mb-5">
            {t({
              ro: "Nu poți avea mai mult de un anunț activ. Finalizează sau anulează anunțul curent înainte de a crea unul nou.",
              en: "You can't have more than one active listing. Complete or cancel your current listing before creating a new one.",
            })}
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href={`/post/${data.activePost.id}`}
              className="inline-flex items-center justify-center gap-2 bg-[#123424] text-white font-bold py-3 px-6 rounded-full hover:bg-[#1a4d36] transition-all shadow-[3px_3px_0px_#75a08c] active:translate-y-[3px] active:shadow-none"
            >
              <FaWineBottle className="w-4 h-4 text-lime-400" />
              {t({ ro: "Vezi anunțul activ", en: "View active listing" })}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function OnboardingSheet({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onDismiss]);

  const tips = [
    {
      icon: <FaCheckCircle className="w-4 h-4 text-lime-600 shrink-0 mt-0.5" />,
      label: (
        <>
          {t({
            ro: "Sticlele trebuie să fie valabile pentru RetuRO SGR, cu marcaj",
            en: "Bottles must be eligible for RetuRO SGR, with the mark",
          })}
          <Image
            src="/images/returo-mark.svg"
            alt="SGR"
            width={24}
            height={12}
            className="inline-block align-middle ml-1 -mt-0.5"
          />
        </>
      ),
    },
    {
      icon: (
        <FaExclamationTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      ),
      label: t({
        ro: "Sticlele turtite, sparte sau murdare excesiv NU sunt acceptate.",
        en: "Crushed, broken or excessively dirty bottles are NOT accepted.",
      }),
    },
    {
      icon: (
        <FaMapMarkerAlt className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
      ),
      label: t({
        ro: "Colectorii din zona ta vor cere preluarea sticlelor, iar tu îl aprobi pe cel care îți convine.",
        en: "Collectors near you will request the pickup, and you approve the one you prefer.",
      }),
    },
    {
      icon: <Coins className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />,
      label: t({
        ro: "Odată ajuns la tine, colectorul îți va oferi suma convenită și va prelua sticlele.",
        en: "Once they arrive, the collector pays you the agreed amount and takes the bottles.",
      }),
    },
    {
      icon: <FaKey className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />,
      label: t({
        ro: "Pentru a finaliza, îi vei arăta codul unic din pagina postării și totul este gata!",
        en: "To finish, you show them the unique code from the listing page and you're done!",
      }),
    },
  ];

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="onboarding-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={onDismiss}
        className="fixed inset-0 z-[9990] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          key="onboarding-sheet"
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="p-6">
            <div className="mb-5">
              <p className="font-extrabold text-slate-900 text-base leading-tight">
                {t({ ro: "Înainte să postezi...", en: "Before you post..." })}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {t({
                  ro: "Câteva lucruri importante de știut",
                  en: "A few important things to know",
                })}
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {tips.map(({ icon, label }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.07, duration: 0.28 }}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-100`}
                >
                  {icon}
                  <p className="text-sm font-semibold text-slate-700 leading-snug">
                    {label}
                  </p>
                </motion.div>
              ))}
            </div>

            <motion.button
              onClick={onDismiss}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#123424] text-white font-bold text-sm hover:bg-[#1a4d36] transition-all cursor-pointer shadow-sm"
            >
              <FaCheckCircle className="w-4 h-4 text-lime-400" />
              {t({ ro: "Am înțeles, continuă", en: "Got it, continue" })}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

export default function PostCreationClient({
  userPhone,
}: {
  userPhone: string | null;
}) {
  const { t } = useI18n();
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

  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowOnboarding(true), 1000);
    return () => clearTimeout(t);
  }, []);

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
      scrollToTop();
    }
  };

  const handleBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
    scrollToTop();
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
          availabilitySchedule: form.availabilitySchedule,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(
          json.error ??
            t({
              ro: "A apărut o eroare. Încearcă din nou.",
              en: "Something went wrong. Try again.",
            }),
        );
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
        t({ ro: "Anunțul a fost publicat!", en: "Your listing is live!" }),
        t({
          ro: "Vei fi notificat atunci când un colector face o cerere.",
          en: "You'll be notified when a collector makes a request.",
        }),
      );

      setActiveCounts({ activePosts: 1, activePostId: json.id });
      router.push(`/post/${json.id}`);
    } catch {
      setError(
        t({
          ro: "Eroare de rețea. Încearcă din nou.",
          en: "Network error. Try again.",
        }),
      );
      setSubmitting(false);
    }
  };

  return (
    <ActivePostGuard>
      {/* {showOnboarding && (
        <OnboardingSheet onDismiss={() => setShowOnboarding(false)} />
      )} */}
      <div className="max-w-lg mx-auto px-4 py-8 min-h-[100dvh]">
        <StepIndicator current={step} />

        <motion.div
          layout
          transition={{ duration: 0.35, ease: SLIDE_EASE }}
          className="bg-white rounded-3xl border border-slate-200 shadow-sm shadow-slate-100/50 overflow-hidden mb-6"
        >
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
        </motion.div>

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
                  <ChevronLeft className="w-4 h-4" />{" "}
                  {t({ ro: "Înapoi", en: "Back" })}
                </motion.button>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {step < STEPS.length - 1 ? (
                <motion.button
                  key="next"
                  type="button"
                  layout
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
                  {t({ ro: "Continuă", en: "Continue" })}{" "}
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.button
                  key="submit"
                  type="button"
                  layout
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
                        {t({ ro: "Se postează...", en: "Posting..." })}
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
