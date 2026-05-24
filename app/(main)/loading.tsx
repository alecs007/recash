"use client";

import { useEffect } from "react";

const MIN_MS = 700;
const FADE_MS = 300;

export default function Loading() {
  useEffect(() => {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      top: "64px",
      left: "0",
      right: "0",
      bottom: "0",
      zIndex: "9998",
      background: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: "0",
      transition: `opacity ${FADE_MS}ms ease`,
      pointerEvents: "none",
    });

    const img = document.createElement("img");
    img.src = "/images/loading-gif.gif";
    img.width = 170;
    img.height = 170;
    img.draggable = false;
    img.alt = "";

    overlay.appendChild(img);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
    });

    function exit() {
      overlay.style.opacity = "0";
      setTimeout(() => overlay.parentNode?.removeChild(overlay), FADE_MS);
    }

    let minPassed = false;
    let pendingExit = false;

    setTimeout(() => {
      minPassed = true;
      if (pendingExit) exit();
    }, MIN_MS);

    return () => {
      if (minPassed) exit();
      else pendingExit = true;
    };
  }, []);

  return null;
}
