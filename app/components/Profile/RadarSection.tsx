"use client";

import "leaflet/dist/leaflet.css";

import Image from "next/image";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RadioTower, MapPin, Loader2, Search, X, Power } from "lucide-react";
import { FaRegCompass } from "react-icons/fa";
import useSWR from "swr";
import { showToast } from "@/lib/toast";
import { useI18n } from "@/context/I18nContext";

const API = process.env.NEXT_PUBLIC_API_VERSION ?? "v1";

const RADII = [1, 2, 5, 10, 25, 50] as const;
type RadiusKm = (typeof RADII)[number];

interface RadarConfig {
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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function RadarSection() {
  const { t } = useI18n();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [mapMounted, setMapMounted] = useState(false);

  const { data, mutate, isLoading } = useSWR<{ radar: RadarConfig | null }>(
    "/api/v1/radar",
    fetcher,
    { revalidateOnFocus: true },
  );

  const radar = data?.radar ?? null;

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationName, setLocationName] = useState("");
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(5);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const latRef = useRef(lat);
  const lngRef = useRef(lng);
  const locationNameRef = useRef(locationName);
  const radiusKmRef = useRef(radiusKm);
  const emailEnabledRef = useRef(emailEnabled);
  const activeRef = useRef(active);

  useEffect(() => {
    latRef.current = lat;
  }, [lat]);
  useEffect(() => {
    lngRef.current = lng;
  }, [lng]);
  useEffect(() => {
    locationNameRef.current = locationName;
  }, [locationName]);
  useEffect(() => {
    radiusKmRef.current = radiusKm;
  }, [radiusKm]);
  useEffect(() => {
    emailEnabledRef.current = emailEnabled;
  }, [emailEnabled]);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // ── Sync server → state (once) ─────────────────────────────────────────
  const syncedRef = useRef(false);
  useEffect(() => {
    if (syncedRef.current || isLoading || data === undefined) return;
    syncedRef.current = true;
    if (!radar) return;
    setLat(radar.latitude);
    setLng(radar.longitude);
    setLocationName(radar.locationName ?? "");
    setSearchQuery(radar.locationName ?? "");
    setRadiusKm(radar.radiusKm);
    setEmailEnabled(radar.emailEnabled);
    setActive(radar.active);
    latRef.current = radar.latitude;
    lngRef.current = radar.longitude;
    locationNameRef.current = radar.locationName ?? "";
    radiusKmRef.current = radar.radiusKm;
    emailEnabledRef.current = radar.emailEnabled;
    activeRef.current = radar.active;
  }, [radar, isLoading, data]);

  // ── Load Leaflet dynamically (client only) ─────────────────────────────
  useEffect(() => {
    import("leaflet").then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__L = L;
      setLeafletReady(true);
    });
  }, []);

  // ── Auto-save ──────────────────────────────────────────────────────────
  const scheduleAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (latRef.current === null || lngRef.current === null) return;
      setSaving(true);
      try {
        const res = await fetch("/api/v1/radar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: latRef.current,
            longitude: lngRef.current,
            locationName: locationNameRef.current,
            radiusKm: radiusKmRef.current,
            emailEnabled: emailEnabledRef.current,
            active: activeRef.current,
          }),
        });
        if (res.ok) {
          const d = await res.json();
          mutate({ radar: d.radar }, { revalidate: false });
        }
      } catch {
        /* non-fatal */
      }
      setSaving(false);
    }, 700);
  }, [mutate]);

  // ── Map helpers ────────────────────────────────────────────────────────
  const buildIcon = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).__L;
    return L.divIcon({
      className: "",
      html: `<div style="position:relative;width:32px;height:32px;background:#f73138;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 5px rgba(0,0,0,.3)"><div style="width:14px;height:14px;background:#fff;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(45deg)"></div></div>`,
      iconSize: [32, 44],
      iconAnchor: [16, 44],
    });
  }, []);

  const updateMapOverlay = useCallback(
    (newLat: number, newLng: number, newRadius: RadiusKm) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).__L;
      if (!L || !mapRef.current) return;

      if (markerRef.current) {
        markerRef.current.setLatLng([newLat, newLng]);
      } else {
        markerRef.current = L.marker([newLat, newLng], {
          icon: buildIcon(),
        }).addTo(mapRef.current);
      }

      if (circleRef.current) circleRef.current.remove();
      const circleColor = activeRef.current ? "#FF6B6B" : "#94a3b8";
      circleRef.current = L.circle([newLat, newLng], {
        radius: newRadius * 1000,
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: activeRef.current ? 0.12 : 0.09,
        weight: 2,
        dashArray: "6 4",
      }).addTo(mapRef.current);

      mapRef.current.fitBounds(circleRef.current.getBounds(), {
        padding: [24, 24],
        animate: true,
        duration: 0.5,
      });
    },
    [buildIcon],
  );

  useEffect(() => {
    if (lat !== null && lng !== null && mapRef.current) {
      updateMapOverlay(lat, lng, radiusKm);
    }
  }, [radiusKm, lat, lng, updateMapOverlay]);

  // ── Reverse geocode ────────────────────────────────────────────────────
  const reverseGeocode = useCallback(
    async (la: number, lo: number): Promise<string> => {
      setReverseLoading(true);
      try {
        const r = await fetch(
          `/api/${API}/geocode?type=reverse&lat=${la}&lon=${lo}`,
        );
        const d = await r.json();
        const addr = d.address ?? {};
        const city =
          addr.city ?? addr.town ?? addr.village ?? addr.county ?? "";
        const road = addr.road ?? addr.neighbourhood ?? addr.suburb ?? "";
        const name =
          [road, city].filter(Boolean).join(", ") ||
          d.display_name?.split(",")[0] ||
          "";
        setLocationName(name);
        setSearchQuery(name);
        locationNameRef.current = name;
        return name;
      } catch {
        return "";
      } finally {
        setReverseLoading(false);
      }
    },
    [],
  );

  // ── Map init ───────────────────────────────────────────────────────────
  // We watch leafletReady + mapMounted together.
  // mapMounted flips to true after the section becomes visible so the
  // container has real dimensions when we call L.map().
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || mapRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).__L;
    const initLat = latRef.current;
    const initLng = lngRef.current;
    const center: [number, number] =
      initLat && initLng ? [initLat, initLng] : [45.9432, 24.9668];

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: initLat ? 10 : 6,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    const invalidate = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          map.invalidateSize({ animate: false });
        });
      });
    };
    invalidate();
    const t = setTimeout(invalidate, 300);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.on("click", async (e: any) => {
      const newLat = e.latlng.lat;
      const newLng = e.latlng.lng;
      setLat(newLat);
      setLng(newLng);
      latRef.current = newLat;
      lngRef.current = newLng;
      updateMapOverlay(newLat, newLng, radiusKmRef.current);
      await reverseGeocode(newLat, newLng);
      scheduleAutoSave();
    });

    mapRef.current = map;
    if (initLat && initLng)
      updateMapOverlay(initLat, initLng, radiusKmRef.current);

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletReady, mapMounted]);

  // Trigger mapMounted after a short delay so the component has rendered
  useEffect(() => {
    if (isLoading) return;
    const t = setTimeout(() => setMapMounted(true), 50);
    return () => clearTimeout(t);
  }, [isLoading]);

  // Also call invalidateSize when the section becomes visible via ResizeObserver
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize({ animate: false });
      }
    });
    ro.observe(mapContainerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!circleRef.current) return;
    const circleColor = active ? "#FF6B6B" : "#94a3b8";
    circleRef.current.setStyle({
      color: circleColor,
      fillColor: circleColor,
      fillOpacity: active ? 0.12 : 0.09,
    });
  }, [active]);

  // ── Search ─────────────────────────────────────────────────────────────
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
    latRef.current = la;
    lngRef.current = lo;
    locationNameRef.current = name;
    updateMapOverlay(la, lo, radiusKmRef.current);
    scheduleAutoSave();
  };

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const la = pos.coords.latitude,
          lo = pos.coords.longitude;
        setLat(la);
        setLng(lo);
        latRef.current = la;
        lngRef.current = lo;
        updateMapOverlay(la, lo, radiusKmRef.current);
        await reverseGeocode(la, lo);
        scheduleAutoSave();
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const handleRadiusChange = (r: RadiusKm) => {
    setRadiusKm(r);
    radiusKmRef.current = r;
    scheduleAutoSave();
  };

  const handleEmailToggle = () => {
    const next = !emailEnabled;
    setEmailEnabled(next);
    emailEnabledRef.current = next;
    scheduleAutoSave();
  };

  const handleActiveToggle = useCallback(async () => {
    if (!radar) return;
    setToggling(true);
    const next = !active;
    setActive(next);
    activeRef.current = next;
    try {
      const res = await fetch("/api/v1/radar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      const d = await res.json();
      if (res.ok) {
        mutate({ radar: d.radar }, { revalidate: false });
        showToast(
          next ? "radar" : "info",
          next
            ? t({ ro: "Radarul este activat ✅", en: "Radar is on ✅" })
            : t({ ro: "Radarul este oprit", en: "Radar is off" }),
          next
            ? t({
                ro: "Vei primi notificări pentru fiecare anunț nou din zona ta.",
                en: "You'll get notified for every new listing in your area.",
              })
            : t({
                ro: "Nu vei mai primi notificări radar.",
                en: "You'll no longer receive radar notifications.",
              }),
        );
      } else {
        // revert on error
        setActive(!next);
        activeRef.current = !next;
      }
    } catch {
      setActive(!next);
      activeRef.current = !next;
    }
    setToggling(false);
  }, [radar, active, mutate]);

  // ── Skeleton ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-4 sm:mx-6 lg:mx-8 mb-8 p-4 sm:p-6 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse">
        <div className="flex items-center justify-between mb-3 sm:mb-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-slate-200 rounded-md" />
            <div className="h-6 w-16 bg-slate-200 rounded-md" />
          </div>
          <div className="h-8 w-20 bg-slate-200 rounded-full" />
        </div>
        <div className="h-4 w-3/4 max-w-md bg-slate-200 rounded mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="h-11 flex-1 bg-slate-200 rounded-xl" />
              <div className="h-11 w-11 bg-slate-200 rounded-xl shrink-0" />
            </div>
            <div className="h-[230px] w-full bg-slate-200 rounded-2xl border-2 border-slate-100" />
          </div>
          <div className="space-y-3 flex flex-col">
            <div className="bg-white border border-slate-100 rounded-2xl p-4">
              <div className="h-4 w-32 bg-slate-200 rounded mb-3" />
              <div className="grid grid-cols-2 gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-[42px] bg-slate-200 rounded-xl border-2 border-slate-100"
                  />
                ))}
              </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-200 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-24 bg-slate-200 rounded" />
                  <div className="h-3 w-48 bg-slate-200 rounded" />
                </div>
              </div>
              <div className="w-11 h-6 bg-slate-200 rounded-full shrink-0" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div
      id="radar"
      className="mx-4 sm:mx-6 lg:mx-8 mb-8 p-4 sm:p-6 bg-slate-50 border border-slate-100 rounded-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-2">
        <div className="flex items-center gap-2">
          <RadioTower
            className={`w-5 h-5  ${active ? "text-lime-500" : "text-slate-400"}`}
          />
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            {t({ ro: "Radar", en: "Radar" })}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
          )}
          {radar && (
            <button
              onClick={handleActiveToggle}
              disabled={toggling}
              className={[
                "relative flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border",
                "transition-all duration-300 ease-in-out cursor-pointer",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                active
                  ? "bg-lime-100 text-lime-700 border-lime-200 hover:bg-lime-200"
                  : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200",
              ].join(" ")}
            >
              <Power
                className={[
                  "w-3.5 h-3.5 transition-all duration-300",
                  active ? "text-lime-600" : "text-slate-400",
                ].join(" ")}
              />
              <span className="transition-all duration-200">
                {toggling ? (
                  <Loader2 className="w-3 h-3 animate-spin inline" />
                ) : active ? (
                  t({ ro: "Activ", en: "On" })
                ) : (
                  t({ ro: "Oprit", en: "Off" })
                )}
              </span>
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-600 mb-4">
        {t({
          ro: "Setează-ți centrul de monitorizare și raza pentru a primi alerte cu fiecare anunț nou din zona ta.",
          en: "Set your monitoring center and radius to get alerts for every new listing in your area.",
        })}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: search + map */}
        <div className="space-y-3">
          {/* Search */}
          <div className="flex gap-2 relative">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t({
                  ro: "Caută o adresă…",
                  en: "Search for an address…",
                })}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-100 outline-none bg-white transition-shadow"
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
                    className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 z-[1000] overflow-hidden shadow-lg"
                  >
                    {searchResults.slice(0, 5).map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectResult(r)}
                        className="w-full text-left px-4 py-2.5 hover:bg-lime-50 text-sm text-slate-700 flex items-start gap-2 border-b border-slate-50 last:border-0 cursor-pointer transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{r.display_name}</span>
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
              className="w-11 h-11 rounded-xl border border-[#123424]/20 hover:bg-[#123424]/10 bg-white flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer shrink-0"
              title={t({ ro: "Folosește locația mea", en: "Use my location" })}
            >
              {geoLoading ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin text-[#123424]" />
              ) : (
                <FaRegCompass className="w-4.5 h-4.5 text-[#123424]" />
              )}
            </button>
          </div>

          {/*
            Map container.
            - NO overflow-hidden — clips Leaflet tiles.
            - Explicit px height; position:relative wrapper + absolute inner div.
          */}
          <div
            style={{
              position: "relative",
              height: 230,
              borderRadius: 16,
              border: "2px solid #e2e8f0",
            }}
          >
            <div
              ref={mapContainerRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 14,
              }}
            />

            {!leafletReady && (
              <div
                style={{ position: "absolute", inset: 0, borderRadius: 14 }}
                className="bg-slate-100 flex items-center justify-center z-10"
              >
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
              </div>
            )}

            {reverseLoading && (
              <div
                style={{ position: "absolute", inset: 0, zIndex: 1001 }}
                className="bg-white/50 backdrop-blur-[2px] flex items-center justify-center"
              >
                <div className="bg-white rounded-xl px-4 py-2 shadow-md flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-[#123424]" />
                  {t({ ro: "Se obține adresa...", en: "Getting the address..." })}
                </div>
              </div>
            )}

            {!lat && leafletReady && (
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 0,
                  right: 0,
                  zIndex: 999,
                }}
                className="flex justify-center pointer-events-none"
              >
                <div className="bg-black/60 backdrop-blur text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                  {t({
                    ro: "Apasă pe hartă pentru a selecta centrul",
                    en: "Tap the map to select the center",
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: radius + email */}
        <div className="space-y-3 flex flex-col">
          <div className="bg-white border border-slate-100 rounded-2xl p-4">
            <p className="text-sm font-semibold text-slate-500 mb-3">
              {t({ ro: "Raza de monitorizare", en: "Monitoring radius" })}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {RADII.map((r) => (
                <motion.button
                  key={r}
                  type="button"
                  onClick={() => handleRadiusChange(r)}
                  whileTap={{ scale: 0.94 }}
                  animate={{
                    backgroundColor:
                      radiusKm === r
                        ? active
                          ? "#123424"
                          : "#94a3b8"
                        : "#f8fafc",
                    borderColor:
                      radiusKm === r
                        ? active
                          ? "#123424"
                          : "#94a3b8"
                        : "#e2e8f0",
                    color: radiusKm === r ? "#ffffff" : "#475569",
                  }}
                  transition={{ duration: 0.15 }}
                  className="py-3 rounded-xl border-2 text-sm font-bold cursor-pointer leading-none"
                >
                  {r} km
                </motion.button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                <Image
                  src="/images/email.svg"
                  alt="Email"
                  width={140}
                  height={140}
                  draggable={false}
                  priority
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {t({ ro: "Notificări email", en: "Email delivery" })}
                </p>
                <p className="text-xs text-slate-400 mr-2">
                  {t({
                    ro: "Primește email la fiecare anunț nou din zona ta.",
                    en: "Get an email for every new listing in your area.",
                  })}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleEmailToggle}
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 ease-in-out cursor-pointer focus:outline-none shrink-0 ${
                emailEnabled
                  ? active
                    ? "bg-lime-400"
                    : "bg-slate-400"
                  : "bg-slate-200"
              }`}
            >
              <motion.div
                animate={{ x: emailEnabled ? 22 : 6 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
