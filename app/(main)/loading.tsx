"use client";

import { useEffect } from "react";

const MIN_MS = 1000;
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

    const video = document.createElement("video");
    video.src = "/videos/loading.mp4";
    video.width = 160;
    video.height = 160;

    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;

    video.playbackRate = 1.2;

    video.style.pointerEvents = "none";
    video.setAttribute("aria-hidden", "true");

    overlay.appendChild(video);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
    });

    function exit() {
      overlay.style.opacity = "0";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, FADE_MS);
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
