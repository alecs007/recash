"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Props {
  page: number | string;
  children: React.ReactNode;
}

export function PageTransition({ page, children }: Props) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={page}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{
          opacity: { duration: 0.18, ease: "easeOut" },
          y: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] },
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
