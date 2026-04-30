"use client";

import { animate, motion, useMotionValue } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function NavigationProgress() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const [visible, setVisible] = useState(false);
  const scaleX = useMotionValue(0);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);

  const start = () => {
    setVisible(true);
    animRef.current?.stop();
    scaleX.set(0);

    animRef.current = animate(scaleX, 0.15, {
      duration: 0.4,
      ease: [0.4, 0, 1, 1],
      onComplete: () => {
        animRef.current = animate(scaleX, 0.78, {
          duration: 16,
          ease: [0.05, 0.1, 0.15, 0.65],
        });
      },
    });
  };

  const finish = () => {
    animRef.current?.stop();

    animRef.current = animate(scaleX, 0.9, {
      duration: 0.4,
      ease: [0.4, 0, 0.6, 1],
      onComplete: () => {
        animRef.current = animate(scaleX, 1, {
          duration: 0.3,
          ease: [0.22, 1, 0.36, 1],
          onComplete: () => {
            setTimeout(() => {
              setVisible(false);
              scaleX.set(0);
            }, 250);
          },
        });
      },
    });
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href || /^(https?:|\/\/|#|mailto:|tel:)/.test(href)) return;
      if (href.split("?")[0] === pathname) return;
      start();
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      finish();
    }
  }, [pathname]);

  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[2px]"
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="h-full w-full origin-left bg-lime-400"
        style={{ scaleX }}
      />
    </motion.div>
  );
}
