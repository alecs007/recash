"use client";

import { animate, motion, useMotionValue, useSpring } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";

export function NavigationProgress() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const [visible, setVisible] = useState(false);

  const rawScaleX = useMotionValue(0);
  const scaleX = useSpring(rawScaleX, {
    stiffness: 200,
    damping: 30,
    restDelta: 0.001,
  });

  const animRef = useRef<ReturnType<typeof animate> | null>(null);

  const start = useCallback(() => {
    setVisible(true);
    animRef.current?.stop();
    rawScaleX.set(0);

    animRef.current = animate(rawScaleX, 0.4, {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onComplete: () => {
        animRef.current = animate(rawScaleX, 0.85, {
          duration: 25,
          ease: "linear",
        });
      },
    });
  }, [rawScaleX]);

  const finish = useCallback(() => {
    animRef.current?.stop();

    animRef.current = animate(rawScaleX, 1, {
      duration: 0.5,
      ease: [0.23, 1, 0.32, 1],
      onComplete: () => {
        setTimeout(() => {
          setVisible(false);

          setTimeout(() => {
            rawScaleX.set(0);
          }, 500);
        }, 150);
      },
    });
  }, [rawScaleX]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href") ?? "";
      const isExternal = /^(https?:|\/\/|#|mailto:|tel:)/.test(href);
      const isSamePage = href.split("?")[0] === pathname;
      const target = anchor.getAttribute("target");

      if (!href || isExternal || isSamePage || target === "_blank") return;

      start();
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname, start]);

  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      finish();
    }
  }, [pathname, finish]);

  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{
        duration: visible ? 0.1 : 0.4,
        ease: "easeInOut",
      }}
    >
      <motion.div
        className="h-full w-full origin-left bg-lime-400 shadow-[0_0_12px_rgba(163,230,53,0.6)]"
        style={{ scaleX }}
      />
    </motion.div>
  );
}
