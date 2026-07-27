"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff } from "lucide-react";
import { useI18n } from "@/context/I18nContext";

interface EmailOptinPopupProps {
  context: "author" | "collector";
  postId: string;
}

const COPY = {
  author: {
    body: {
      ro: "Vrei să fii anunțat pe email atunci când un colector face o cerere pentru acest anunț?",
      en: "Would you like an email when a collector requests this listing?",
    },
    yes: { ro: "Da, anunță-mă", en: "Yes, notify me" },
    no: { ro: "Nu, mulțumesc", en: "No, thanks" },
  },
  collector: {
    body: {
      ro: "Vrei să fii anunțat pe email atunci când autorul aprobă sau refuză cererea ta pentru acest anunț?",
      en: "Would you like an email when the author approves or declines your request for this listing?",
    },
    yes: { ro: "Da, anunță-mă", en: "Yes, notify me" },
    no: { ro: "Nu, mulțumesc", en: "No, thanks" },
  },
};

const ISLAND_COPY = {
  title: { ro: "Notificări email", en: "Email notifications" },
  toggle: {
    ro: "Comută notificările pe email",
    en: "Toggle email notifications",
  },
};

type Phase = "hidden" | "ask" | "island";

export function EmailOptinPopup({ context, postId }: EmailOptinPopupProps) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("hidden");
  const [optedIn, setOptedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    fetch(
      `/api/v1/notifications/email-optin?context=${context}&postId=${encodeURIComponent(postId)}`,
    )
      .then((r) => r.json())
      .then((data: { answered: boolean; optedIn: boolean }) => {
        if (cancelled) return;
        if (data.answered) {
          setOptedIn(data.optedIn);
          setPhase("island");
        } else {
          timer = setTimeout(() => {
            if (!cancelled) setPhase("ask");
          }, 1200);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [context, postId]);

  const respond = useCallback(
    async (optIn: boolean) => {
      setLoading(true);
      try {
        await fetch("/api/v1/notifications/email-optin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ optIn, context, postId }),
        });
      } catch {
      } finally {
        setOptedIn(optIn);
        setPhase("island");
        setLoading(false);
      }
    },
    [context, postId],
  );

  const copy = COPY[context];

  return (
    <AnimatePresence mode="wait">
      {phase === "ask" && (
        <motion.div
          key="ask"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 340, damping: 26 }}
          className="
            fixed bottom-5 left-4 right-4 z-[10000]
            sm:left-auto sm:right-5 sm:w-80
            lg:absolute lg:bottom-5 lg:right-5 lg:left-auto lg:w-80 lg:z-20
          "
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow shadow-slate-200/60 p-4">
            <div className="flex items-top  gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                <Image
                  src="/images/email.svg"
                  alt="Email"
                  width={120}
                  height={120}
                  draggable={false}
                  priority
                />
              </div>

              <p className="text-sm text-slate-600">{t(copy.body)}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => respond(false)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-40 cursor-pointer"
              >
                <BellOff className="w-3.5 h-3.5" />
                {t(copy.no)}
              </button>
              <button
                onClick={() => respond(true)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#123424] text-xs font-bold text-white hover:bg-[#1a4d36] transition-all disabled:opacity-40 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-lime-400" />
                {t(copy.yes)}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {phase === "island" && (
        <motion.div
          key="island"
          initial={{ opacity: 0, y: 18, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="
            fixed bottom-5 left-4 z-[9000]
            lg:absolute lg:bottom-5 lg:left-auto lg:right-5 lg:z-20
          "
        >
          <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-3 py-2">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors ${
                optedIn ? "bg-lime-100" : "bg-slate-100"
              }`}
            >
              {optedIn ? (
                <Bell className="h-4 w-4 text-[#123424]" />
              ) : (
                <BellOff className="h-4 w-4 text-slate-400" />
              )}
            </span>

            <span className="text-sm font-semibold text-slate-700">
              {t(ISLAND_COPY.title)}
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={optedIn}
              aria-label={t(ISLAND_COPY.toggle)}
              onClick={() => respond(!optedIn)}
              disabled={loading}
              className={`relative w-11 h-6 shrink-0 rounded-full transition-colors duration-300 ease-in-out cursor-pointer focus:outline-none disabled:opacity-50 ${
                optedIn ? "bg-lime-400" : "bg-slate-200"
              }`}
            >
              <motion.div
                animate={{ x: optedIn ? 22 : 6 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
              />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
