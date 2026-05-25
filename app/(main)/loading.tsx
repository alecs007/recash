"use client";

import { useEffect } from "react";

const MIN_MS = 900;
const FADE_MS = 300;

// Fetch the video once and hold it as a blob URL in memory.
// Runs the moment this module is first imported (app-shell load),
// so by the time the user triggers a navigation the video is usually
// already buffered locally — even on a slow connection.
let _blobUrl: string | null = null;
let _fetchPromise: Promise<string | null> | null = null;

function primeVideoCache(): Promise<string | null> {
  if (_blobUrl) return Promise.resolve(_blobUrl);
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = fetch("/videos/loading.mp4")
    .then((r) => (r.ok ? r.blob() : null))
    .then((blob) => {
      if (!blob) return null;
      _blobUrl = URL.createObjectURL(blob);
      return _blobUrl;
    })
    .catch(() => null);

  return _fetchPromise;
}

// Kick off the fetch immediately on import — not on render.
primeVideoCache();

export default function Loading() {
  useEffect(() => {
    let destroyed = false; // component unmounted
    let showing = false;   // overlay is currently visible
    let minElapsed = false; // MIN_MS has passed since overlay appeared
    let wantExit = false;   // cleanup was called while we were still waiting

    // ── overlay shell ──────────────────────────────────────────────────────
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
    document.body.appendChild(overlay);

    // ── exit helpers ───────────────────────────────────────────────────────
    function doExit() {
      if (destroyed) return;
      destroyed = true;
      overlay.style.opacity = "0";
      setTimeout(() => overlay.parentNode?.removeChild(overlay), FADE_MS);
    }

    // Called once the video fires `canplay` — we know it will play smoothly.
    function fadeIn() {
      if (destroyed) return;
      showing = true;

      requestAnimationFrame(() => {
        overlay.style.opacity = "1";
      });

      // Minimum visible time starts NOW (video is actually playing).
      setTimeout(() => {
        minElapsed = true;
        if (wantExit) doExit();
      }, MIN_MS);
    }

    // ── wait for blob, build video, wait for canplay ───────────────────────
    primeVideoCache().then((src) => {
      // Component already unmounted while we were fetching — skip everything.
      if (destroyed || !src) {
        overlay.parentNode?.removeChild(overlay);
        return;
      }

      const video = document.createElement("video");
      video.src = src;
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

      // Show only once the browser has enough data to start playing.
      video.addEventListener("canplay", fadeIn, { once: true });
      video.play().catch(() => {});
    });

    // ── cleanup (component unmounted = new page is ready) ──────────────────
    return () => {
      wantExit = true;

      if (!showing) {
        // Video never appeared — remove the invisible overlay immediately.
        doExit();
      } else if (minElapsed) {
        // Already shown for long enough — exit now.
        doExit();
      }
      // Otherwise: video is showing but MIN_MS hasn't elapsed yet.
      // The setTimeout inside fadeIn() will call doExit() when it fires.
    };
  }, []);

  return null;
}