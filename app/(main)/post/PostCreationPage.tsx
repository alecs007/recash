"use client";

import { useState, useCallback, useRef, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  FaWineBottle,
  FaMapMarkerAlt,
  FaPercent,
  FaCheckCircle,
  FaRegCompass,
} from "react-icons/fa";
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
  Clock,
} from "lucide-react";
import { BOTTLE_PRESETS, RON_PER_BOTTLE } from "@/lib/validations/post";
import { toast } from "sonner";
import useSWR from "swr";
import { useSetActiveCounts } from "@/hooks/useActiveCounts";

const API = process.env.NEXT_PUBLIC_API_VERSION ?? "v1";

interface FormData {
  bottleCount: number;
  collectorSharePercent: number;
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
  collectorSharePercent: 30,
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
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all font-bold text-sm border-2 z-10
                  ${done ? "bg-lime-400 border-lime-400 text-black" : ""}
                  ${active ? "bg-[#123424] border-[#123424] text-white scale-110" : ""}
                  ${!done && !active ? "bg-white border-slate-200 text-slate-400" : ""}
                `}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <path
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>

              <span
                className={`mt-2 text-[10px] font-semibold text-center leading-tight transition-all
                ${active ? "text-[#123424]" : "text-slate-400"}
              `}
              >
                {step.label}
              </span>
            </div>

            {idx < STEPS.length - 1 && (
              <div className="flex-1 flex items-center h-9">
                <div
                  className={`w-full h-0.5 transition-all ${done ? "bg-lime-400" : "bg-slate-200"}`}
                />
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const estimatedValue = parseFloat(
    (data.bottleCount * RON_PER_BOTTLE).toFixed(2),
  );

  const applyCount = (fn: (prev: number) => number) =>
    onChange({ bottleCount: fn(data.bottleCount) });

  const clamp = (n: number) => Math.max(0, Math.min(10_000, n));

  const startPress = (dir: 1 | -1) => {
    onChange({ bottleCount: clamp(data.bottleCount + dir) });
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
          <button
            type="button"
            onPointerDown={() => startPress(-1)}
            onPointerUp={stopPress}
            onPointerLeave={stopPress}
            disabled={data.bottleCount <= 0}
            className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:border-slate-300 active:scale-95 transition-all disabled:opacity-30 cursor-pointer"
          >
            <Minus className="w-4 h-4 text-slate-600" />
          </button>

          <input
            type="number"
            min={0}
            max={10000}
            value={data.bottleCount || ""}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              onChange({ bottleCount: isNaN(v) ? 0 : clamp(v) });
            }}
            placeholder="0"
            className="flex-1 text-center text-4xl font-black text-[#123424] bg-transparent outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />

          <button
            type="button"
            onPointerDown={() => startPress(1)}
            onPointerUp={stopPress}
            onPointerLeave={stopPress}
            disabled={data.bottleCount >= 10_000}
            className="w-12 h-12 rounded-xl bg-[#123424] flex items-center justify-center hover:bg-[#1a4d36] active:scale-95 transition-all disabled:opacity-30 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-lime-400" />
          </button>
        </div>

        <div className="mt-2 h-9 flex items-center justify-center transition-opacity">
          <div className="inline-flex items-center gap-1 rounded-full px-4 py-1.5">
            <span className="text-xs text-slate-500">
              {data.bottleCount} × 0,50 RON =
            </span>

            <span className="text-sm font-black text-lime-700">
              {estimatedValue.toFixed(2)} RON
            </span>
          </div>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((preset) => {
            const isActive = data.bottleCount === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => onChange({ bottleCount: preset.value })}
                className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition-all cursor-pointer
                  ${
                    isActive
                      ? "border-lime-400 bg-lime-50 shadow-sm shadow-lime-100"
                      : "border-slate-100 bg-white hover:border-lime-300 hover:bg-lime-50/40"
                  }`}
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
                  className={`text-xs font-bold leading-tight text-center ${isActive ? "text-lime-800" : "text-slate-700"}`}
                >
                  {preset.label}
                </span>
                {isActive && (
                  <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-lime-400 flex items-center justify-center">
                    <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24">
                      <path
                        stroke="currentColor"
                        strokeWidth={3.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
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
  const mapRef = useRef<L.Map>(null);
  const markerRef = useRef<L.Marker>(null);
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
    map.on("click", (e) => setPin(e.latlng.lat, e.latlng.lng));
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
        <FieldLabel>Care este locația ta?</FieldLabel>
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

            <button
              type="button"
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
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-12 mt-1 bg-white rounded-xl border border-slate-200 z-[1002] overflow-hidden">
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
            </div>
          )}
        </div>

        {geoError && (
          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
            <span>⚠</span> {geoError}
          </p>
        )}
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
                Apasă pe hartă pentru a plasa un pin
              </div>
            </div>
          )}
        </div>
      </div>

      {data.latitude && (
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
      )}
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

  return (
    <div className="space-y-6">
      <div>
        <FieldLabel>Cum vrei să imparți valoarea?</FieldLabel>

        <div className="mt-4">
          <div className="relative h-6 flex items-center mb-4">
            <div className="absolute w-full h-3 rounded-full overflow-hidden flex shadow-inner bg-slate-200">
              <div
                className="h-full bg-lime-400 transition-all duration-150"
                style={{ width: `${data.collectorSharePercent}%` }}
              />

              <div
                className="h-full bg-[#123424] transition-all duration-150"
                style={{ width: `${100 - data.collectorSharePercent}%` }}
              />
            </div>

            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={data.collectorSharePercent}
              onChange={(e) =>
                onChange({ collectorSharePercent: parseInt(e.target.value) })
              }
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
              <span className="text-[10px] tracking-wider text-slate-400 font-semibold">
                Partea ta
              </span>
              <span className="text-lg font-black text-lime-600">
                {100 - data.collectorSharePercent}%
                <span className="ml-1 text-xs font-semibold text-lime-600/60">
                  (
                  {(
                    (estimatedValue * (100 - data.collectorSharePercent)) /
                    100
                  ).toFixed(2)}{" "}
                  RON)
                </span>
              </span>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] tracking-wider text-slate-400 font-semibold">
                Partea colectorului
              </span>{" "}
              <span className="text-lg font-black text-[#123424]">
                {data.collectorSharePercent}%{" "}
                <span className="ml-1 text-xs font-semibold text-slate-400">
                  (
                  {(
                    (estimatedValue * data.collectorSharePercent) /
                    100
                  ).toFixed(2)}{" "}
                  RON)
                </span>
              </span>
            </div>
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
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-100 outline-none bg-white resize-none transition-shadow"
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
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-100 outline-none bg-white transition-shadow"
          />
        </div>
      </div>

      <div>
        <FieldLabel>Cât timp vrei să fie valabil anunțul?</FieldLabel>
        <div className="grid grid-cols-4 gap-2">
          {EXPIRY_OPTIONS.map(({ h, label }) => (
            <button
              key={h}
              type="button"
              onClick={() => onChange({ expiresInHours: h })}
              className={`py-3 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5
                ${
                  data.expiresInHours === h
                    ? "bg-[#123424] text-white border-[#123424]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
            >
              {label}
            </button>
          ))}
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
  const posterPct = 100 - data.collectorSharePercent;
  const posterEarning = parseFloat(
    ((estimatedValue * posterPct) / 100).toFixed(2),
  );
  const collectorEarning = parseFloat(
    (estimatedValue - posterEarning).toFixed(2),
  );

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
      value: `${posterEarning.toFixed(2)} RON (${posterPct}%)`,
      accent: "green",
    },
    {
      label: "Colectorul primește",
      value: `${collectorEarning.toFixed(2)} RON (${data.collectorSharePercent}%)`,
      accent: data.collectorSharePercent === 100 ? "purple" : "lime",
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
          <div
            key={i}
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
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
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
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">
            Ai deja un anunț activ
          </h2>
          <p className="text-sm text-slate-600 mb-5">
            Poți avea un singur anunț activ simultan. Finalizează sau anulează
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
    if (canProceed()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo(0, 0);
  };
  const handleBack = () => {
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

      const res = await fetch(`/api/${API}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bottleCount: form.bottleCount,
          estimatedValue,
          collectorSharePercent: form.collectorSharePercent,
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

      toast.success("Anunțul a fost publicat!", {
        description: "Vei fi notificat atunci când un colector face o cerere.",
      });

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

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-6">
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
            <StepConfirm data={form} submitting={submitting} error={error} />
          )}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-3.5 rounded-full border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:border-slate-300 transition-all disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Înapoi
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#123424] text-white font-bold text-sm hover:bg-[#1a4d36] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Continuă <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-lime-400 text-black font-bold text-sm hover:bg-lime-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                  Se postează...
                </>
              ) : (
                <>
                  <FaWineBottle className="w-4 h-4" />
                  Postează anunțul
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </ActivePostGuard>
  );
}
