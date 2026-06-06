"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff } from "lucide-react";

interface EmailOptinPopupProps {
  context: "author" | "collector";
  postId: string;
}

const COPY = {
  author: {
    heading: "Notificare pe email?",
    body: "Vrei să fii anunțat pe email atunci când un colector face o cerere pentru acest anunț?",
    yes: "Da, anunță-mă",
    no: "Nu, mulțumesc",
  },
  collector: {
    heading: "Notificare de confirmare?",
    body: "Vrei să fii anunțat pe email atunci când autorul aprobă sau refuză cererea ta pentru acest anunț?",
    yes: "Da, anunță-mă",
    no: "Nu, mulțumesc",
  },
};

export function EmailOptinPopup({ context, postId }: EmailOptinPopupProps) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/v1/notifications/email-optin?context=${context}&postId=${encodeURIComponent(postId)}`,
    )
      .then((r) => r.json())
      .then((data: { answered: boolean }) => {
        if (cancelled) return;
        if (!data.answered) {
          setTimeout(() => {
            if (!cancelled) setVisible(true);
          }, 1200);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
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
        // Non-fatal
      } finally {
        setAnswered(true);
        setLoading(false);

        setTimeout(() => setVisible(false), 200);
      }
    },
    [context, postId],
  );

  const copy = COPY[context];

  return (
    <AnimatePresence>
      {visible && !answered && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 340, damping: 26 }}
          className="
            fixed bottom-5 left-4 right-4 z-[9000]
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

              <p className="text-sm text-slate-600">{copy.body}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => respond(false)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-40 cursor-pointer"
              >
                <BellOff className="w-3.5 h-3.5" />
                {copy.no}
              </button>
              <button
                onClick={() => respond(true)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#123424] text-xs font-bold text-white hover:bg-[#1a4d36] transition-all disabled:opacity-40 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-lime-400" />
                {copy.yes}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
