"use client";

import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface AnalyzeResult {
  estimate: number;
  confidence: "scăzut" | "mediu" | "ridicat";
  note: string;
  remainingToday: number;
}

interface AiBottleAnalyzerProps {
  onApply: (count: number) => void;
  onClose: () => void;
}

const CONFIDENCE_LABEL: Record<string, { text: string; color: string }> = {
  scăzut: { text: "Estimare aproximativă", color: "#f59e0b" },
  mediu: { text: "Estimare rezonabilă", color: "#a3e635" },
  ridicat: { text: "Estimare sigură", color: "#a3e635" },
};

export function AiBottleAnalyzer({ onApply, onClose }: AiBottleAnalyzerProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Selectează o imagine (JPEG, PNG, WebP).");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Imaginea depășește 4MB. Comprimă-o înainte.");
      return;
    }
    setError("");
    setResult(null);
    setMimeType(file.type);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      // Strip the data:mime/type;base64, prefix
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/v1/ai/analyze-bottles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analiza a eșuat.");
        return;
      }
      setResult(data as AnalyzeResult);
    } catch {
      setError("Eroare de rețea. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onApply(result.estimate);
      onClose();
    }
  };

  const confCfg = result
    ? (CONFIDENCE_LABEL[result.confidence] ?? CONFIDENCE_LABEL["mediu"])
    : null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Estimare AI
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Fotografiază sticlele pentru o estimare automată
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <div className="px-6 pb-6 space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !imagePreview && inputRef.current?.click()}
              className={[
                "relative rounded-2xl border-2 transition-all overflow-hidden",
                imagePreview
                  ? "border-slate-200 cursor-default"
                  : "border-dashed cursor-pointer",
                dragging
                  ? "border-lime-400 bg-lime-50"
                  : imagePreview
                    ? ""
                    : "border-slate-200 hover:border-slate-300 bg-slate-50",
              ].join(" ")}
              style={{ minHeight: imagePreview ? 200 : 140 }}
            >
              {imagePreview ? (
                <>
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    width={480}
                    height={300}
                    className="w-full object-cover"
                    style={{ maxHeight: 220 }}
                    unoptimized
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setImagePreview(null);
                      setImageBase64(null);
                      setResult(null);
                      setError("");
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-1">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-5 h-5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-600">
                    {dragging
                      ? "Eliberează imaginea"
                      : "Trage sau apasă pentru a adăuga"}
                  </p>
                  <p className="text-xs text-slate-400">
                    JPEG, PNG sau WebP · max 4MB
                  </p>
                </div>
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processFile(file);
                e.target.value = "";
              }}
            />

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-red-500 font-medium overflow-hidden"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Result */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.28 }}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Estimare
                    </span>
                    {confCfg && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: confCfg.color + "20",
                          color:
                            confCfg.color === "#a3e635" ? "#4d7c0f" : "#92400e",
                        }}
                      >
                        {confCfg.text}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-[#123424] tabular-nums">
                      {result.estimate}
                    </span>
                    <span className="text-sm text-slate-400">sticle</span>
                  </div>
                  {result.note && (
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      {result.note}
                    </p>
                  )}
                  {result.remainingToday < 3 && (
                    <p className="text-[10px] text-slate-400 mt-2">
                      {result.remainingToday} analize rămase azi
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-2.5">
              {result ? (
                <>
                  <button
                    onClick={() => {
                      setResult(null);
                    }}
                    className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:border-slate-300 transition-all cursor-pointer"
                  >
                    Reîncearcă
                  </button>
                  <motion.button
                    onClick={handleApply}
                    whileTap={{ scale: 0.97 }}
                    className="flex-[1.6] py-3 rounded-xl bg-[#123424] text-white font-bold text-sm hover:bg-[#1a4d36] transition-all cursor-pointer"
                  >
                    Aplică {result.estimate} sticle
                  </motion.button>
                </>
              ) : (
                <motion.button
                  onClick={
                    imageBase64
                      ? handleAnalyze
                      : () => inputRef.current?.click()
                  }
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3.5 rounded-xl bg-[#123424] text-white font-bold text-sm hover:bg-[#1a4d36] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeOpacity="0.25"
                        />
                        <path
                          d="M12 3a9 9 0 0 1 9 9"
                          stroke="#a3e635"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      Se analizează...
                    </>
                  ) : imageBase64 ? (
                    "Analizează cu AI"
                  ) : (
                    "Adaugă o fotografie"
                  )}
                </motion.button>
              )}
            </div>

            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              3 analize/zi · Funcționează cu saci, cutii sau grămezi de sticle
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
