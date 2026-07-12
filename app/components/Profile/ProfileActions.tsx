"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLoading } from "@/context/LoadingContext";
import {
  FileText,
  Lock,
  Bug,
  HelpCircle,
  LogOut,
  Trash2,
  ChevronRight,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useI18n } from "@/context/I18nContext";

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
  const { t } = useI18n();
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
            aria-label={t({ ro: "Închide", en: "Close" })}
            className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 disabled:opacity-40 cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
          </button>
        </div>

        <h3 className="text-lg font-extrabold text-slate-900 mb-1.5">
          {t({
            ro: "Șterge contul definitiv?",
            en: "Delete your account permanently?",
          })}
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-4">
          {t({
            ro: "Toate datele tale — postări, tranzacții, badge-uri și istoricul de activitate — vor fi șterse permanent și nu vor putea fi recuperate.",
            en: "All your data — posts, transactions, badges and activity history — will be permanently deleted and cannot be recovered.",
          })}
        </p>

        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-amber-700">
            {t({
              ro: "Această acțiune este ireversibilă și nu poate fi anulată.",
              en: "This action is irreversible and cannot be undone.",
            })}
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
            {t({ ro: "Anulează", en: "Cancel" })}
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
                {t({ ro: "Șterge contul", en: "Delete account" })}
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
  const { t } = useI18n();
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
        setDeleteError(
          j.error ??
            t({
              ro: "Eroare la ștergerea contului.",
              en: "Failed to delete the account.",
            }),
        );
        setDeleting(false);
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setDeleteError(
        t({
          ro: "Eroare de rețea. Încearcă din nou.",
          en: "Network error. Try again.",
        }),
      );
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
              {t({ ro: "Termeni și Condiții", en: "Terms & Conditions" })}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </Link>

          <Link href="/confidentialitate" className={ROW_BASE}>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-slate-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700 flex-1">
              {t({
                ro: "Politica de confidențialitate",
                en: "Privacy Policy",
              })}
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
              {t({ ro: "Raportează o problemă", en: "Report a problem" })}
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
              {t({ ro: "Suport utilizatori", en: "User support" })}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </a>

          <button
            onClick={() => {
              show(t({ ro: "Se deconectează...", en: "Signing out..." }));
              signOut({ callbackUrl: "/" });
            }}
            className={`w-full ${ROW_BASE} hover:!bg-red-50 cursor-pointer`}
          >
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-sm font-semibold text-red-500 flex-1 text-left">
              {t({ ro: "Deconectează-te", en: "Sign out" })}
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
