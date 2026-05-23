"use client";

import { ReactNode, useEffect, useRef } from "react";
import Lenis from "lenis";

interface SmoothScrollProps {
  children: ReactNode;
}

let _lenis: Lenis | null = null;

export function scrollToTop() {
  if (_lenis) {
    _lenis.stop();
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => {
      _lenis?.start();
    });
  } else {
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}

export default function SmoothScroll({ children }: SmoothScrollProps) {
  const rafIdRef = useRef<number | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
    });
    lenisRef.current = lenis;
    _lenis = lenis;

    function raf(time: number) {
      lenis.raf(time);
      rafIdRef.current = requestAnimationFrame(raf);
    }

    rafIdRef.current = requestAnimationFrame(raf);

    const resizeObserver = new ResizeObserver(() => {
      lenis.resize();
    });
    resizeObserver.observe(document.body);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      lenis.destroy();
      resizeObserver.disconnect();
      lenisRef.current = null;
      _lenis = null;
    };
  }, []);

  return <>{children}</>;
}
