"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  page: number;
  children: React.ReactNode;
}

export function PageTransition({ page, children }: Props) {
  const [visible, setVisible] = useState(true);
  const [displayed, setDisplayed] = useState(children);
  const prevPage = useRef(page);

  useEffect(() => {
    if (page === prevPage.current) {
      setDisplayed(children);
      return;
    }

    setVisible(false);
    const t = setTimeout(() => {
      setDisplayed(children);
      prevPage.current = page;
      setVisible(true);
    }, 180);
    return () => clearTimeout(t);
  }, [page, children]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.18s ease",
      }}
    >
      {displayed}
    </div>
  );
}
