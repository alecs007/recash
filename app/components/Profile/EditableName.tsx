"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { VerifiedBadge } from "../UI/VerifiedBadge";

interface Props {
  initialName: string | null;
  certified: boolean;
}

export function EditableName({ initialName, certified }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleEditClick = () => {
    flushSync(() => {
      setEditing(true);
    });

    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  };

  const cancel = useCallback(() => {
    setName(initialName ?? "");
    setEditing(false);
    setError("");
  }, [initialName]);

  useEffect(() => {
    if (!editing) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        cancel();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editing, cancel]);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) {
      setError("Numele trebuie să aibă între 1 și 100 de caractere.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/v1/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Eroare la salvare.");
        return;
      }
      setEditing(false);
    } catch {
      setError("Eroare de rețea.");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div
        ref={containerRef}
        className="flex flex-col gap-1.5 mb-0.5 min-h-[40px] sm:min-h-[48px] justify-center"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 100))}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
              if (e.key === "Escape") cancel();
            }}
            maxLength={100}
            placeholder="Numele tău"
            className="text-base sm:text-lg font-extrabold text-white bg-white/10 border-2 border-lime-400/60 rounded-xl px-3 py-1 outline-none focus:border-lime-400 transition-all w-full max-w-[180px] sm:max-w-xs placeholder:text-white/40 min-w-0"
          />
          <button
            onClick={() => void save()}
            disabled={saving}
            className="shrink-0 w-8 h-8 rounded-full bg-lime-400 hover:bg-lime-300 text-[#123424] flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            )}
          </button>
          <button
            onClick={cancel}
            disabled={saving}
            className="shrink-0 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {error && <p className="text-xs text-red-300 font-medium">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 group/name mb-0.5 min-h-[40px] sm:min-h-[48px]">
      <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight truncate">
        {name || "Utilizator"}
      </h1>
      {certified && (
        <VerifiedBadge className="w-5 h-5 sm:w-7 sm:h-7 shrink-0" />
      )}
      <button
        onClick={handleEditClick}
        title="Editează numele"
        aria-label="Editează numele"
        className="ml-1 shrink-0 w-7 h-7 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center cursor-pointer transition-all opacity-40 hover:opacity-100 group-hover/name:opacity-70 focus:opacity-100"
      >
        <Pencil className="w-3.5 h-3.5 text-white" />
      </button>
    </div>
  );
}
