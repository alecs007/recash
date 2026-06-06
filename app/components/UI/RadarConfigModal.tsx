"use client";

import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Loader2, MapPin, CheckCircle, Trash2 } from "lucide-react";
import { FaRegCompass } from "react-icons/fa";

const API = process.env.NEXT_PUBLIC_API_VERSION ?? "v1";

const RADII = [1, 2, 5, 10, 25, 50] as const;
type RadiusKm = (typeof RADII)[number];

export interface RadarConfig {
  id: string;
  latitude: number;
  longitude: number;
  locationName: string | null;
  radiusKm: RadiusKm;
  emailEnabled: boolean;
  active: boolean;
}

interface GeocodeResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface RadarConfigModalProps {
  isOpen: boolean;
  existing: RadarConfig | null;
  onClose: () => void;
  onSaved: (radar: RadarConfig) => void;
  onDeleted: () => void;
}

function useLeaflet() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  return ready;
}

export function RadarConfigModal({
  isOpen,
  existing,
  onClose,
  onSaved,
  onDeleted,
}: RadarConfigModalProps) {
  const leafletReady = useLeaflet();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [lat, setLat] = useState<number | null>(existing?.latitude ?? null);
  const [lng, setLng] = useState<number | null>(existing?.longitude ?? null);
  const [locationName, setLocationName] = useState(
    existing?.locationName ?? "",
  );
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(existing?.radiusKm ?? 5);
  const [emailEnabled, setEmailEnabled] = useState(
    existing?.emailEnabled ?? false,
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(existing?.locationName ?? "");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLat(existing?.latitude ?? null);
      setLng(existing?.longitude ?? null);
      setLocationName(existing?.locationName ?? "");
      setRadiusKm(existing?.radiusKm ?? 5);
      setEmailEnabled(existing?.emailEnabled ?? false);
      setSearchQuery(existing?.locationName ?? "");
      setConfirmDelete(false);
      setError("");
    }
  }, [isOpen, existing]);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [isOpen, onClose]);

  const updateMapOverlay = useCallback(
    (newLat: number, newLng: number, newRadius: RadiusKm) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (!L || !mapRef.current) return;

      const customIcon = L.divIcon({
        className: "",
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#a3e635;border:3px solid #123424;box-shadow:0 0 0 4px rgba(163,230,53,0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      if (markerRef.current) {
        markerRef.current.setLatLng([newLat, newLng]);
        markerRef.current.setIcon(customIcon);
      } else {
        markerRef.current = L.marker([newLat, newLng], {
          icon: customIcon,
        }).addTo(mapRef.current);
      }

      if (circleRef.current) circleRef.current.remove();
      circleRef.current = L.circle([newLat, newLng], {
        radius: newRadius * 1000,
        color: "#a3e635",
        fillColor: "#a3e635",
        fillOpacity: 0.08,
        weight: 2,
        dashArray: "6 4",
      }).addTo(mapRef.current);

      mapRef.current.setView(
        [newLat, newLng],
        Math.max(mapRef.current.getZoom(), 11),
        { animate: true, duration: 0.5 },
      );
    },
    [],
  );

  // Redraw circle when radius changes
  useEffect(() => {
    if (lat !== null && lng !== null && mapRef.current) {
      updateMapOverlay(lat, lng, radiusKm);
    }
  }, [radiusKm, lat, lng, updateMapOverlay]);

  const reverseGeocode = useCallback(async (la: number, lo: number) => {
    setReverseLoading(true);
    try {
      const r = await fetch(
        `/api/${API}/geocode?type=reverse&lat=${la}&lon=${lo}`,
      );
      const d = await r.json();
      const addr = d.address ?? {};
      const city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? "";
      const road = addr.road ?? addr.neighbourhood ?? addr.suburb ?? "";
      const name =
        [road, city].filter(Boolean).join(", ") ||
        d.display_name?.split(",")[0] ||
        "";
      setLocationName(name);
      setSearchQuery(name);
    } catch {
    } finally {
      setReverseLoading(false);
    }
  }, []);

  // Init map
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;

    const center: [number, number] =
      lat && lng ? [lat, lng] : [45.9432, 24.9668];
    const zoom = lat ? 12 : 6;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.on("click", (e: any) => {
      setLat(e.latlng.lat);
      setLng(e.latlng.lng);
      updateMapOverlay(e.latlng.lat, e.latlng.lng, radiusKm);
      reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    if (lat && lng) updateMapOverlay(lat, lng, radiusKm);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletReady]);

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
        const r = await fetch(
          `/api/${API}/geocode?type=search&q=${encodeURIComponent(q)}`,
        );
        const d = await r.json();
        setSearchResults(Array.isArray(d) ? d : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 450);
  };

  const handleSelectResult = (result: GeocodeResult) => {
    const la = parseFloat(result.lat);
    const lo = parseFloat(result.lon);
    const name = result.display_name.split(",").slice(0, 2).join(", ").trim();
    setLat(la);
    setLng(lo);
    setLocationName(name);
    setSearchQuery(name);
    setSearchResults([]);
    updateMapOverlay(la, lo, radiusKm);
  };

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude,
          lo = pos.coords.longitude;
        setLat(la);
        setLng(lo);
        updateMapOverlay(la, lo, radiusKm);
        reverseGeocode(la, lo);
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const handleSave = async () => {
    if (lat === null || lng === null) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/v1/radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          locationName,
          radiusKm,
          emailEnabled,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "A apărut o eroare. Încearcă din nou.");
        setSaving(false);
        return;
      }
      onSaved(d.radar);
    } catch {
      setError("Eroare de rețea. Încearcă din nou.");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch("/api/v1/radar", { method: "DELETE" });
      onDeleted();
    } catch {
      setDeleting(false);
    }
  };

  const canSave = lat !== null && lng !== null && !saving;

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9990] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 48, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh]"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>

            {/* Scrollable body */}
            <div
              className="overflow-y-auto flex-1 px-5 pt-6 pb-4 space-y-4"
              data-lenis-prevent
            >
              <div>
                <p className="text-base font-extrabold text-slate-900 tracking-tight mb-4">
                  {existing ? "Editează radarul" : "Configurează radarul"}
                </p>

                {/* Search */}
                <div className="flex gap-2 relative">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Caută o adresă sau apasă pe hartă…"
                      className="w-full pl-9 pr-8 py-3 rounded-xl border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-100 outline-none text-sm bg-white transition-shadow"
                    />
                    {(searchLoading || reverseLoading) && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
                    )}
                    {searchQuery && !searchLoading && !reverseLoading && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                      </button>
                    )}
                    <AnimatePresence>
                      {searchResults.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 z-10 overflow-hidden shadow-lg"
                        >
                          {searchResults.slice(0, 5).map((r, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSelectResult(r)}
                              className="w-full text-left px-4 py-2.5 hover:bg-lime-50 text-sm text-slate-700 flex items-start gap-2 border-b border-slate-50 last:border-0 cursor-pointer transition-colors"
                            >
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="line-clamp-1">
                                {r.display_name}
                              </span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button
                    type="button"
                    onClick={handleGPS}
                    disabled={geoLoading}
                    className="w-11 h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                    title="Folosește locația mea"
                  >
                    {geoLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : (
                      <FaRegCompass className="w-4 h-4 text-[#123424]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Map */}
              <div
                className="relative rounded-2xl overflow-hidden border-2 border-slate-200"
                style={{ height: 220 }}
              >
                <div ref={mapContainerRef} className="w-full h-full" />
                {!leafletReady && (
                  <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                  </div>
                )}
                {!lat && leafletReady && (
                  <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none z-10">
                    <div className="bg-black/60 backdrop-blur text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                      Apasă pe hartă pentru a seta centrul
                    </div>
                  </div>
                )}
              </div>

              {/* Selected pin */}
              <AnimatePresence>
                {lat !== null && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-lime-50 border border-lime-200 rounded-xl">
                      <MapPin className="w-4 h-4 text-lime-600 shrink-0" />
                      <p className="text-sm font-semibold text-lime-800 flex-1 truncate">
                        {locationName ||
                          `${lat.toFixed(4)}, ${lng?.toFixed(4)}`}
                      </p>
                      <button
                        onClick={() => {
                          setLat(null);
                          setLng(null);
                          setLocationName("");
                          setSearchQuery("");
                          if (markerRef.current) {
                            markerRef.current.remove();
                            markerRef.current = null;
                          }
                          if (circleRef.current) {
                            circleRef.current.remove();
                            circleRef.current = null;
                          }
                        }}
                        className="w-5 h-5 rounded-full hover:bg-lime-200 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3 text-lime-600" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Radius */}
              <div>
                <p className="text-xs text-slate-500 mb-2">
                  Raza de monitorizare
                </p>
                <div className="flex gap-1.5">
                  {RADII.map((r) => (
                    <motion.button
                      key={r}
                      type="button"
                      onClick={() => setRadiusKm(r)}
                      whileTap={{ scale: 0.94 }}
                      animate={{
                        backgroundColor: radiusKm === r ? "#123424" : "#ffffff",
                        borderColor: radiusKm === r ? "#123424" : "#e2e8f0",
                        color: radiusKm === r ? "#ffffff" : "#475569",
                      }}
                      transition={{ duration: 0.15 }}
                      className="flex-1 py-2.5 rounded-xl border-2 text-xs font-bold cursor-pointer leading-none"
                    >
                      {r < 10 ? `${r} km` : `${r}km`}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Email toggle */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center`}
                  >
                    <Image
                      src="/images/email.svg"
                      alt="Email"
                      width={120}
                      height={120}
                      draggable={false}
                      priority
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Notificări email
                    </p>
                    <p className="text-xs text-slate-400">
                      Primește email la fiecare anunț nou
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailEnabled((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${
                    emailEnabled ? "bg-lime-400" : "bg-slate-200"
                  }`}
                >
                  <motion.div
                    animate={{ x: emailEnabled ? 22 : 6 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                  />
                </button>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-red-500 font-medium overflow-hidden"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-5 pb-5 pt-2 border-t border-slate-100 space-y-2">
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#123424] text-white font-bold text-sm hover:bg-[#1a4d36] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-lime-400" />
                )}
                {saving
                  ? "Se salvează…"
                  : existing
                    ? "Salvează modificările"
                    : "Activează radarul"}
              </button>

              {existing && (
                <AnimatePresence mode="wait">
                  {confirmDelete ? (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="flex gap-2"
                    >
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        Înapoi
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all disabled:opacity-40 cursor-pointer"
                      >
                        {deleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Șterge radarul
                      </button>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="delete-trigger"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setConfirmDelete(true)}
                      className="w-full py-2 text-xs font-semibold text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      Șterge radarul
                    </motion.button>
                  )}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
