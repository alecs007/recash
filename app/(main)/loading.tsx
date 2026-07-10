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
    top: "var(--header-height)",
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
  const video = overlay.querySelector("video");

  if (video) {
    if (!_isVisible) {
      _isVisible = true;
      requestAnimationFrame(() => {
        if (_overlay) _overlay.style.opacity = "1";
      });
    }
    _resetMinTimer();
    return;
  }

  // No video yet at all: create it once, show on canplay
  const newVideo = document.createElement("video");
  newVideo.src = src;
  newVideo.width = 160;
  newVideo.height = 160;
  newVideo.autoplay = true;
  newVideo.loop = true;
  newVideo.muted = true;
  newVideo.playsInline = true;
  newVideo.playbackRate = 1.2;
  newVideo.style.pointerEvents = "none";
  newVideo.setAttribute("aria-hidden", "true");
  overlay.appendChild(newVideo);

  newVideo.addEventListener(
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

  newVideo.play().catch(() => {});
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
