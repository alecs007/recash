"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { showToast } from "@/lib/toast";
import { scrollToTop } from "@/app/components/UX/SmoothScroll";

type ToastLevel = "success" | "info" | "warning" | "error";

type Toast = {
  title: string;
  message?: string;
  level: ToastLevel;
};

const TOAST_MAP: Record<string, Toast> = {
  post_cancelled: {
    title: "Anunț anulat",
    message: "Anunțul tău a fost anulat cu succes.",
    level: "info",
  },
  claim_denied: {
    title: "Cerere refuzată",
    message: "Autorul a refuzat cererea ta. Anunțul este din nou disponibil.",
    level: "error",
  },
  claim_cancelled: {
    title: "Colectare anulată",
    message: "Ai renunțat la colectare. Anunțul este din nou disponibil.",
    level: "info",
  },
  collection_cancelled_poster: {
    title: "Colectare anulată",
    message: "Ai anulat colectarea în desfășurare.",
    level: "warning",
  },
  collection_cancelled_collector: {
    title: "Colectare anulată",
    message: "Ai renunțat la această colectare.",
    level: "warning",
  },
};

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const firedRef = useRef<string | null>(null);

  const isMapPage = pathname === "/map";

  useEffect(() => {
    scrollToTop();
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  useEffect(() => {
    const key = searchParams.get("toast");
    if (!key || !TOAST_MAP[key] || firedRef.current === key) return;
    firedRef.current = key;
    const { title, message, level } = TOAST_MAP[key];
    showToast(level, title, message);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("toast");
    const qs = params.toString() ? `?${params.toString()}` : "";
    router.replace(`${pathname}${qs}`, { scroll: false });
  }, [searchParams, router, pathname]);

  return (
    <motion.div
      key={pathname}
      initial={isMapPage ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
      animate={isMapPage ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
      exit={isMapPage ? { opacity: 0 } : { opacity: 0, scale: 1.02, y: -8 }}
      transition={{
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{ width: "100%" }}
    >
      {children}
    </motion.div>
  );
}
