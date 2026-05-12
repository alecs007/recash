"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

type ToastLevel = "success" | "info" | "warning" | "error";

const TOAST_MAP: Record<string, { message: string; level: ToastLevel }> = {
  post_cancelled: {
    message: "Anunțul a fost anulat.",
    level: "info",
  },
  claim_denied: {
    message: "Cererea a fost refuzată. Anunțul este din nou disponibil.",
    level: "info",
  },
  claim_cancelled: {
    message: "Ai renunțat la colectare. Anunțul este din nou disponibil.",
    level: "info",
  },
  collection_cancelled_poster: {
    message: "Colectarea a fost anulată.",
    level: "warning",
  },
  collection_cancelled_collector: {
    message: "Ai anulat colectarea.",
    level: "warning",
  },
};

const FIRE: Record<ToastLevel, (msg: string) => void> = {
  success: (msg) => toast.success(msg),
  info: (msg) => toast.info(msg),
  warning: (msg) => toast.warning(msg),
  error: (msg) => toast.error(msg),
};

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const firedRef = useRef<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  useEffect(() => {
    const key = searchParams.get("toast");
    if (!key || !TOAST_MAP[key] || firedRef.current === key) return;

    firedRef.current = key;
    const { message, level } = TOAST_MAP[key];
    FIRE[level](message);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("toast");
    const qs = params.toString() ? `?${params.toString()}` : "";
    router.replace(`${pathname}${qs}`, { scroll: false });
  }, [searchParams, router, pathname]);

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, scale: 0.98, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.02, y: -8 }}
      transition={{
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1], // Custom "Expo" easing for that premium feel
      }}
      style={{ width: "100%" }}
    >
      {children}
    </motion.div>
  );
}
