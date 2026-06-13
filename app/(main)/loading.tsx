"use client";

import { useEffect } from "react";

const MIN_MS = 900;
const FADE_MS = 300;

// ── Video pre-fetch (runs once at import time) ──────────────────────────────
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

primeVideoCache();

// ── Singleton overlay — shared across all Loading mounts ────────────────────
//
// The problem with creating a new overlay per mount:
//   A→B navigation  →  Loading #1 mounts, creates overlay-1, shows it
//   B loads quickly  →  Loading #1 unmounts, overlay-1 starts its 900ms exit
//   B→C navigation  →  Loading #2 mounts, creates overlay-2
//   User sees: overlay-1 disappears, overlay-2 appears  ← the flash
//
// Fix: one overlay div for the lifetime of the module.  A new mount cancels
// any in-progress fade-out and resets the minimum-display timer.

let _mountCount = 0;
let _overlay: HTMLDivElement | null = null;
let _isVisible = false; // overlay is opaque + video is playing
let _minElapsed = false; // MIN_MS has passed since the overlay became visible
let _pendingHide = false; // hide was requested but min time hasn't elapsed yet
let _minTimer: ReturnType<typeof setTimeout> | null = null;
let _hideTimer: ReturnType<typeof setTimeout> | null = null;

function _clearHide() {
  if (_hideTimer !== null) {
    clearTimeout(_hideTimer);
    _hideTimer = null;
  }
  _pendingHide = false;
}

function _doHide() {
  if (!_overlay) return;
  _isVisible = false;
  _minElapsed = false;
  _pendingHide = false;
  _overlay.style.opacity = "0";
  const el = _overlay;
  _hideTimer = setTimeout(() => {
    _hideTimer = null;
    el.parentNode?.removeChild(el);
    if (_overlay === el) _overlay = null;
  }, FADE_MS);
}

function _maybeHide() {
  if (_mountCount > 0) return; // still mounted somewhere
  if (_isVisible && !_minElapsed) {
    _pendingHide = true;
    return;
  } // defer
  _doHide();
}

function _onMinElapsed() {
  _minTimer = null;
  _minElapsed = true;
  if (_pendingHide && _mountCount === 0) _doHide();
}

function _resetMinTimer() {
  if (_minTimer) clearTimeout(_minTimer);
  _minElapsed = false;
  _minTimer = setTimeout(_onMinElapsed, MIN_MS);
}

function _ensureOverlay(): HTMLDivElement {
  if (_overlay && document.body.contains(_overlay)) return _overlay;
  const div = document.createElement("div");
  Object.assign(div.style, {
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
  document.body.appendChild(div);
  _overlay = div;
  return div;
}

function _attachAndShow(src: string) {
  // A new navigation just started — cancel any in-progress hide
  _clearHide();

  const overlay = _ensureOverlay();

  // Already visible with a video playing: just reset the minimum-time guard
  // so rapid navigations each get their full MIN_MS
  if (_isVisible && overlay.querySelector("video")) {
    _resetMinTimer();
    return;
  }

  // Not yet visible: create the video element once, show on canplay
  if (!overlay.querySelector("video")) {
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

    video.addEventListener(
      "canplay",
      () => {
        if (_mountCount === 0) return; // page loaded before video was ready
        _isVisible = true;
        requestAnimationFrame(() => {
          if (_overlay) _overlay.style.opacity = "1";
        });
        _resetMinTimer();
      },
      { once: true },
    );

    video.play().catch(() => {});
  }
}

export default function Loading() {
  useEffect(() => {
    _mountCount++;

    primeVideoCache().then((src) => {
      if (_mountCount === 0 || !src) return; // already unmounted or no video
      _attachAndShow(src);
    });

    return () => {
      _mountCount = Math.max(0, _mountCount - 1);
      _maybeHide();
    };
  }, []);

  return null;
}
