"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Props {
  page: number;
  children: React.ReactNode;
}

export function PageTransition({ page, children }: Props) {
  return (
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={page}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
