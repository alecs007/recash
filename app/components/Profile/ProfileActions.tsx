"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLoading } from "@/context/LoadingContext";
import {
  FileText,
  Bug,
  HelpCircle,
  LogOut,
  Trash2,
  ChevronRight,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";

function DeleteModal({
  onConfirm,
  onClose,
  loading,
  error,
}: {
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
  error: string;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={() => !loading && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 8 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 disabled:opacity-40 cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5 text-slate-600" />
          </button>
        </div>

        <h3 className="text-lg font-extrabold text-slate-900 mb-1.5">
          Șterge contul definitiv?
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-4">
          Toate datele tale — postări, tranzacții, badge-uri și istoricul de
          activitate — vor fi șterse permanent și nu vor putea fi recuperate.
        </p>

        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-amber-700">
            Această acțiune este ireversibilă și nu poate fi anulată.
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="text-sm text-red-500 font-medium mb-3 overflow-hidden"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-40 cursor-pointer"
          >
            Anulează
          </button>
          <motion.button
            onClick={onConfirm}
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="flex-[1.4] flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                Șterge contul
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

const ROW_BASE =
  "flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors";

export function ProfileActions() {
  const { show } = useLoading();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/v1/profile", { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        setDeleteError(j.error ?? "Eroare la ștergerea contului.");
        setDeleting(false);
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setDeleteError("Eroare de rețea. Încearcă din nou.");
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="mx-4 sm:mx-6 lg:mx-8 mb-12">
        <div className="rounded-2xl overflow-hidden border border-slate-100 bg-white divide-y divide-slate-100">
          <Link href="/termeni" className={ROW_BASE}>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-slate-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700 flex-1">
              Termeni și Condiții
            </span>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </Link>

          <a
            href="mailto:contact@recash.ro?subject=Raportare%20problem%C4%83"
            className={ROW_BASE}
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <Bug className="w-4 h-4 text-slate-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700 flex-1">
              Raportează o problemă
            </span>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </a>

          <a
            href="mailto:contact@recash.ro?subject=Suport%20Recash"
            className={ROW_BASE}
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4 text-slate-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700 flex-1">
              Suport
            </span>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </a>

          <button
            onClick={() => {
              show("Se deconectează...");
              signOut({ callbackUrl: "/" });
            }}
            className={`w-full ${ROW_BASE} hover:!bg-red-50 cursor-pointer`}
          >
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-sm font-semibold text-red-500 flex-1 text-left">
              Deconectează-te
            </span>
          </button>

          {/* <button
            onClick={() => setShowDeleteModal(true)}
            className={`w-full ${ROW_BASE} hover:!bg-red-50 cursor-pointer`}
          >
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-sm font-semibold text-red-500 flex-1 text-left">
              Șterge contul
            </span>
          </button> */}
        </div>
      </div>

      <AnimatePresence>
        {showDeleteModal && (
          <DeleteModal
            onConfirm={() => void handleDeleteAccount()}
            onClose={() => {
              if (!deleting) {
                setShowDeleteModal(false);
                setDeleteError("");
              }
            }}
            loading={deleting}
            error={deleteError}
          />
        )}
      </AnimatePresence>
    </>
  );
}
