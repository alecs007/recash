"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  FaWineBottle,
  FaMapMarkerAlt,
  FaPercent,
  FaCheckCircle,
} from "react-icons/fa";
import {
  MapPin,
  Navigation,
  ChevronLeft,
  ChevronRight,
  Info,
  Camera,
  X,
} from "lucide-react";
import { BOTTLE_PRESETS, RON_PER_BOTTLE } from "@/lib/validations/post";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  bottleCount: number | "";
  customBottleCount: number | "";
  selectedPreset: number | null;
  estimatedValue: number;
  collectorSharePercent: number;
  description: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string;
  address: string;
  phone: string;
  images: string[];
  expiresInHours: number;
}

const INITIAL: FormData = {
  bottleCount: "",
  customBottleCount: "",
  selectedPreset: null,
  estimatedValue: 0,
  collectorSharePercent: 30,
  description: "",
  latitude: null,
  longitude: null,
  locationName: "",
  address: "",
  phone: "",
  images: [],
  expiresInHours: 48,
};

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { label: "Sticle", Icon: FaWineBottle },
  { label: "Locație", Icon: FaMapMarkerAlt },
  { label: "Împărțire", Icon: FaPercent },
  { label: "Confirmare", Icon: FaCheckCircle },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, idx) => {
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={idx} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all font-bold text-sm border-2
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
                className={`text-[10px] font-semibold ${active ? "text-[#123424]" : "text-slate-400"}`}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`w-12 h-0.5 mb-4 mx-1 transition-all ${done ? "bg-lime-400" : "bg-slate-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Bottle Count ─────────────────────────────────────────────────────

function StepBottles({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (d: Partial<FormData>) => void;
}) {
  const handlePreset = (preset: (typeof BOTTLE_PRESETS)[number]) => {
    if (preset.value === 0) {
      onChange({ selectedPreset: 0, bottleCount: "", customBottleCount: "" });
    } else {
      const val = preset.value;
      onChange({
        selectedPreset: val,
        bottleCount: val,
        customBottleCount: "",
        estimatedValue: parseFloat((val * RON_PER_BOTTLE).toFixed(2)),
      });
    }
  };

  const handleCustom = (v: string) => {
    const n = parseInt(v);
    if (v === "") {
      onChange({ customBottleCount: "", bottleCount: "", estimatedValue: 0 });
    } else if (!isNaN(n) && n > 0) {
      onChange({
        customBottleCount: n,
        bottleCount: n,
        estimatedValue: parseFloat((n * RON_PER_BOTTLE).toFixed(2)),
      });
    }
  };

  return (
    <div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-1">
        Câte sticle ai?
      </h2>
      <p className="text-sm text-slate-500 mb-5">
        Alege o variantă aproximativă sau introdu numărul exact.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {BOTTLE_PRESETS.map((preset) => {
          const isSelected =
            preset.value === 0
              ? data.selectedPreset === 0
              : data.selectedPreset === preset.value;

          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => handlePreset(preset)}
              className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all cursor-pointer text-center
                ${isSelected ? "border-lime-400 bg-lime-50" : "border-slate-200 bg-white hover:border-lime-300"}`}
            >
              {preset.image ? (
                <div className="w-16 h-16 relative">
                  <Image
                    src={preset.image}
                    alt={preset.label}
                    fill
                    sizes="64px"
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center">
                  <FaWineBottle className="w-7 h-7 text-slate-400" />
                </div>
              )}
              <div>
                <p className="font-bold text-sm text-slate-900">
                  {preset.label}
                </p>
                <p className="text-[11px] text-slate-500">{preset.desc}</p>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-lime-400 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24">
                    <path
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom input when "Altul" is selected */}
      {data.selectedPreset === 0 && (
        <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Număr exact de sticle
          </label>
          <input
            type="number"
            min={1}
            max={10000}
            value={data.customBottleCount}
            onChange={(e) => handleCustom(e.target.value)}
            placeholder="ex: 37"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-100 outline-none text-lg font-bold text-slate-900 bg-white"
          />
        </div>
      )}

      {/* Value preview */}
      {(data.bottleCount as number) > 0 && (
        <div className="mt-4 p-4 bg-[#123424]/5 rounded-2xl border border-[#123424]/10 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">
              Valoare estimată SGR
            </p>
            <p className="text-xs text-slate-500">
              {data.bottleCount} sticle × 0,50 RON
            </p>
          </div>
          <p className="text-2xl font-black text-[#123424]">
            {data.estimatedValue.toFixed(2)}{" "}
            <span className="text-base font-semibold">RON</span>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Location ─────────────────────────────────────────────────────────

function StepLocation({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (d: Partial<FormData>) => void;
}) {
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [reverseLoading, setReverseLoading] = useState(false);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      setReverseLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ro`,
          { headers: { "Accept-Language": "ro" } },
        );
        const json = await res.json();
        const addr = json.address ?? {};
        const city =
          addr.city ?? addr.town ?? addr.village ?? addr.county ?? "";
        const road = addr.road ?? addr.neighbourhood ?? "";
        const locationName = [road, city].filter(Boolean).join(", ");
        const fullAddress = json.display_name ?? "";
        onChange({ locationName, address: fullAddress });
      } catch {
        // non-fatal
      } finally {
        setReverseLoading(false);
      }
    },
    [onChange],
  );

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocalizarea nu este suportată de browser.");
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onChange({ latitude: lat, longitude: lng });
        reverseGeocode(lat, lng);
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        setGeoError(
          err.code === 1
            ? "Acces la locație refuzat. Activează locația în browser."
            : "Nu am putut obține locația.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const hasLocation = data.latitude !== null && data.longitude !== null;

  return (
    <div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-1">
        Unde sunt sticlele?
      </h2>
      <p className="text-sm text-slate-500 mb-5">
        Colectorul va veni la această adresă să ridice sticlele.
      </p>

      {/* GPS button */}
      <button
        type="button"
        onClick={handleGetLocation}
        disabled={geoLoading}
        className="w-full flex items-center justify-center gap-3 py-4 px-5 rounded-2xl border-2 border-dashed border-[#123424]/30 bg-[#123424]/5 hover:bg-[#123424]/10 hover:border-[#123424]/50 transition-all mb-4 disabled:opacity-50 cursor-pointer"
      >
        {geoLoading ? (
          <div className="w-5 h-5 border-2 border-[#123424] border-t-transparent rounded-full animate-spin" />
        ) : (
          <Navigation className="w-5 h-5 text-[#123424]" />
        )}
        <span className="font-bold text-[#123424]">
          {geoLoading
            ? "Se obține locația..."
            : "Folosește locația dispozitivului"}
        </span>
      </button>

      {geoError && (
        <p className="text-red-500 text-sm mb-3 flex items-center gap-1">
          <Info className="w-4 h-4 shrink-0" /> {geoError}
        </p>
      )}

      {/* Manual input */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Denumire locație{" "}
            <span className="text-slate-400 font-normal">
              (ex: Str. Republicii 14, Cluj)
            </span>
          </label>
          <input
            type="text"
            value={data.locationName}
            onChange={(e) => onChange({ locationName: e.target.value })}
            placeholder="Introdu adresa sau denumirea locului"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-100 outline-none text-sm bg-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Latitudine
            </label>
            <input
              type="number"
              step="any"
              value={data.latitude ?? ""}
              onChange={(e) =>
                onChange({ latitude: parseFloat(e.target.value) || null })
              }
              placeholder="ex: 46.770"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-100 outline-none text-sm bg-white font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Longitudine
            </label>
            <input
              type="number"
              step="any"
              value={data.longitude ?? ""}
              onChange={(e) =>
                onChange({ longitude: parseFloat(e.target.value) || null })
              }
              placeholder="ex: 23.589"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-100 outline-none text-sm bg-white font-mono"
            />
          </div>
        </div>
      </div>

      {/* Map preview */}
      {hasLocation && (
        <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 relative">
          <iframe
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${data.longitude! - 0.005}%2C${data.latitude! - 0.003}%2C${data.longitude! + 0.005}%2C${data.latitude! + 0.003}&layer=mapnik&marker=${data.latitude!}%2C${data.longitude!}`}
            className="w-full h-48"
            style={{ border: 0 }}
            loading="lazy"
          />
          {reverseLoading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[#123424] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5 text-xs font-semibold text-slate-700 max-w-[80%]">
            <MapPin className="w-3.5 h-3.5 text-lime-600 shrink-0" />
            <span className="truncate">
              {data.locationName || "Locație selectată"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Split + Details ──────────────────────────────────────────────────

function StepDetails({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (d: Partial<FormData>) => void;
}) {
  const posterPercent = 100 - data.collectorSharePercent;
  const posterEarning = (data.estimatedValue * posterPercent) / 100;
  const collectorEarning =
    (data.estimatedValue * data.collectorSharePercent) / 100;

  const isDonation = data.collectorSharePercent === 100;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length + data.images.length > 5) {
      alert("Maxim 5 imagini");
      return;
    }
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        onChange({ images: [...data.images, reader.result as string] });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx: number) => {
    onChange({ images: data.images.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 mb-1">
          Detalii anunț
        </h2>
        <p className="text-sm text-slate-500">
          Configurează procentele și adaugă o descriere.
        </p>
      </div>

      {/* Percentage picker */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-slate-800">
            Împărțire valoare
          </span>
          {isDonation && (
            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              🌍 Donație
            </span>
          )}
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
          className="w-full h-2 appearance-none bg-gradient-to-r from-[#123424] to-lime-400 rounded-full cursor-pointer"
          style={{
            background: `linear-gradient(to right, #a3e635 0%, #a3e635 ${data.collectorSharePercent}%, #e2e8f0 ${data.collectorSharePercent}%, #e2e8f0 100%)`,
          }}
        />

        <div className="flex justify-between mt-3 gap-3">
          <div className="flex-1 p-3 bg-[#123424]/5 rounded-xl text-center">
            <p className="text-xs text-slate-500 mb-0.5">Tu primești</p>
            <p className="text-xl font-black text-[#123424]">
              {posterPercent}%
            </p>
            <p className="text-sm font-bold text-slate-600">
              {posterEarning.toFixed(2)} RON
            </p>
          </div>
          <div className="flex items-center text-slate-300 font-bold text-lg">
            ↔
          </div>
          <div className="flex-1 p-3 bg-lime-50 rounded-xl text-center">
            <p className="text-xs text-slate-500 mb-0.5">Colectorul primește</p>
            <p className="text-xl font-black text-lime-600">
              {data.collectorSharePercent}%
            </p>
            <p className="text-sm font-bold text-slate-600">
              {collectorEarning.toFixed(2)} RON
            </p>
          </div>
        </div>

        {isDonation && (
          <p className="mt-3 text-xs text-purple-600 bg-purple-50 p-2 rounded-xl text-center">
            💜 Donezi integral valoarea sticlelor colectorului. Mulțumim!
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Descriere <span className="text-red-500">*</span>
        </label>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="ex: 80 de sticle PET de apă, câteva doze de bere, toate curate, la intrarea blocului lângă coșul de gunoi..."
          rows={3}
          maxLength={500}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-100 outline-none text-sm bg-white resize-none"
        />
        <p className="text-xs text-slate-400 text-right mt-1">
          {data.description.length}/500
        </p>
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Număr de telefon{" "}
          <span className="text-slate-400 font-normal">(opțional)</span>
        </label>
        <input
          type="tel"
          value={data.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder="+40 700 000 000"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-lime-400 focus:ring-2 focus:ring-lime-100 outline-none text-sm bg-white"
        />
        <p className="text-xs text-slate-400 mt-1">
          Vizibil doar colectorului aprobat.
        </p>
      </div>

      {/* Expiry */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Anunțul expiră în
        </label>
        <div className="flex gap-2">
          {[12, 24, 48, 72].map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => onChange({ expiresInHours: h })}
              className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer
                ${data.expiresInHours === h ? "bg-[#123424] text-white border-[#123424]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      {/* Image upload */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Poze sticle{" "}
          <span className="text-slate-400 font-normal">(opțional, max 5)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {data.images.map((src, idx) => (
            <div
              key={idx}
              className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200"
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {data.images.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-lime-400 hover:text-lime-600 transition-colors cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              <span className="text-[10px] font-semibold">Adaugă</span>
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>
    </div>
  );
}

// ─── Step 4: Confirmation ─────────────────────────────────────────────────────

function StepConfirm({
  data,
  submitting,
  error,
}: {
  data: FormData;
  submitting: boolean;
  error: string;
}) {
  const posterPercent = 100 - data.collectorSharePercent;
  const posterEarning = (data.estimatedValue * posterPercent) / 100;
  const collectorEarning =
    (data.estimatedValue * data.collectorSharePercent) / 100;
  const isDonation = data.collectorSharePercent === 100;

  return (
    <div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-1">
        Verifică anunțul
      </h2>
      <p className="text-sm text-slate-500 mb-5">
        Revizuiește detaliile înainte de a posta.
      </p>

      <div className="space-y-3">
        <Row label="Sticle" value={`${data.bottleCount} buc`} />
        <Row
          label="Valoare estimată"
          value={`${data.estimatedValue.toFixed(2)} RON`}
        />
        <Row
          label="Tu primești"
          value={
            isDonation
              ? "0 RON (donație)"
              : `${posterEarning.toFixed(2)} RON (${posterPercent}%)`
          }
        />
        <Row
          label="Colectorul primește"
          value={`${collectorEarning.toFixed(2)} RON (${data.collectorSharePercent}%)`}
          highlight={isDonation}
        />
        <Row
          label="Locație"
          value={
            data.locationName ||
            `${data.latitude?.toFixed(4)}, ${data.longitude?.toFixed(4)}`
          }
        />
        <Row label="Descriere" value={data.description} multiline />
        {data.phone && <Row label="Telefon" value={data.phone} />}
        <Row label="Expiră în" value={`${data.expiresInHours} ore`} />
        {isDonation && (
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-center text-sm text-purple-700 font-semibold">
            🌍 Anunțul tău este o donație. Mulțumim că ajuți!
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-semibold">
          {error}
        </div>
      )}

      {submitting && (
        <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 text-sm">
          <div className="w-4 h-4 border-2 border-[#123424] border-t-transparent rounded-full animate-spin" />
          Se trimite anunțul...
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  multiline,
  highlight,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span
        className={`text-sm font-semibold text-right ${multiline ? "break-words max-w-xs" : ""} ${highlight ? "text-purple-600" : "text-slate-900"}`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

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

  const update = useCallback((partial: Partial<FormData>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  // Validate each step before proceeding
  const canProceed = () => {
    if (step === 0) return (form.bottleCount as number) > 0;
    if (step === 1)
      return (
        form.latitude !== null &&
        form.longitude !== null &&
        form.locationName.trim().length > 0
      );
    if (step === 2) return form.description.trim().length >= 3;
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/v1/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bottleCount: form.bottleCount,
          estimatedValue: form.estimatedValue,
          collectorSharePercent: form.collectorSharePercent,
          description: form.description.trim(),
          latitude: form.latitude,
          longitude: form.longitude,
          locationName: form.locationName.trim() || null,
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          images: form.images,
          expiresInHours: form.expiresInHours,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "A apărut o eroare.");
        setSubmitting(false);
        return;
      }

      // Success → redirect to post page
      router.push(`/post/${json.id}`);
    } catch {
      setError("Eroare de rețea. Încearcă din nou.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Postează sticle
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Câteva minute, bani în buzunar.
        </p>
      </div>

      <StepIndicator current={step} />

      {/* Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-6">
        {step === 0 && <StepBottles data={form} onChange={update} />}
        {step === 1 && <StepLocation data={form} onChange={update} />}
        {step === 2 && <StepDetails data={form} onChange={update} />}
        {step === 3 && (
          <StepConfirm data={form} submitting={submitting} error={error} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={handleBack}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-3 rounded-full border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:border-slate-300 transition-all disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Înapoi
          </button>
        )}

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-[#123424] text-white font-bold text-sm hover:bg-[#1a4d36] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Continuă <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !canProceed()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-lime-400 text-black font-bold text-sm hover:bg-lime-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
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

      {/* Step hint */}
      {!canProceed() && (
        <p className="text-center text-xs text-slate-400 mt-3">
          {step === 0 && "Selectează numărul de sticle pentru a continua."}
          {step === 1 && "Adaugă locația înainte de a continua."}
          {step === 2 && "Adaugă o descriere de minim 3 caractere."}
        </p>
      )}
    </div>
  );
}
