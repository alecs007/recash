"use client";

import { animate, motion, useMotionValue } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useCallback } from "react";

export function NavigationProgress() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);

  // Use MotionValue for the progress
  const scaleX = useMotionValue(0);
  // Use a separate MotionValue for opacity to control it via animate()
  const opacity = useMotionValue(0);

  const animRef = useRef<ReturnType<typeof animate> | null>(null);

  const start = useCallback(() => {
    animRef.current?.stop();

    // 1. Instant reset for a new navigation
    scaleX.jump(0);

    // 2. Smoothly fade in the bar
    animate(opacity, 1, { duration: 0.2 });

    // 3. Initial "burst" to 25% (less jumpy than 40%)
    animRef.current = animate(scaleX, 0.25, {
      duration: 0.5,
      ease: [0.215, 0.61, 0.355, 1], // Ease Out Quad
      onComplete: () => {
        // 4. Slow crawl to 85%
        animRef.current = animate(scaleX, 0.85, {
          duration: 30,
          ease: "linear",
        });
      },
    });
  }, [scaleX, opacity]);

  const finish = useCallback(() => {
    animRef.current?.stop();

    // 1. Fill the bar to 100%
    animate(scaleX, 1, {
      duration: 0.4,
      ease: [0.23, 1, 0.32, 1], // Strong Ease Out
      onComplete: () => {
        // 2. After it hits 100%, fade it out smoothly
        animate(opacity, 0, {
          duration: 0.4,
          onComplete: () => {
            setVisible(false);
            // 3. ONLY reset scale to 0 once it is completely invisible
            scaleX.jump(0);
          },
        });
      },
    });
  }, [scaleX, opacity]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href") || "";
      const target = anchor.getAttribute("target");

      // Filter out externals/hashes/same-page
      if (
        !href ||
        href.startsWith("#") ||
        target === "_blank" ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      )
        return;

      // Parse URL to check if it's a real route change
      const url = new URL(href, window.location.href);
      if (url.pathname === window.location.pathname) return;

      start();
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [start]);

  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      finish();
    }
  }, [pathname, finish]);

  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]"
      style={{ opacity }} // Controlled by our manual animation
    >
      <motion.div
        className="h-full w-full origin-left bg-lime-400 shadow-[0_0_12px_rgba(163,230,53,0.6)]"
        style={{ scaleX }} // Direct motion value, no spring "velocity" issues
      />
    </motion.div>
  );
}
