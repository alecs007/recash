"use client";

import { useEffect } from "react";

const MIN_MS = 700;
const FADE_MS = 320;

export default function Loading() {
  useEffect(() => {
    const STYLE_ID = "recash-loading-keyframes";
    if (!document.getElementById(STYLE_ID)) {
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = `
        @keyframes rcLoadingTilt {
          0%,100% { transform: rotate(-13deg) translate(-2px, 0px);   }
          50%      { transform: rotate( 11deg) translate( 2px, -7px);  }
        }
      `;
      document.head.appendChild(s);
    }

    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      top: "64px",
      left: "0",
      right: "0",
      bottom: "0",
      zIndex: "9998",
      background: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: "0",
      transition: `opacity ${FADE_MS}ms ease`,
      pointerEvents: "none",
    });

    const img = document.createElement("img");
    img.src = "/images/loading.avif";
    img.width = 150;
    img.height = 150;
    img.draggable = false;
    img.alt = "";
    Object.assign(img.style, {
      display: "block",
      animation: `rcLoadingTilt 0.55s ease-in-out infinite`,
      transformOrigin: "50% 90%",
    });

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
      if (minPassed) {
        exit();
      } else {
        pendingExit = true;
      }
    };
  }, []);

  return null;
}
