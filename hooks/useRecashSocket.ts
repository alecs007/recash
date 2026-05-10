"use client";

/**
 * hooks/useRecashSocket.ts  (v2)
 *
 * One WebSocket connection per browser tab, shared across all components
 * via module-level singletons. Multiple components can call this hook safely —
 * they all share the same underlying socket.
 *
 * Bugs fixed vs v1:
 *  1. CONNECTING guard: readyState 0 is now treated the same as OPEN for
 *     idempotency — we never close an in-flight handshake on re-render /
 *     React Strict-Mode double-invoke.
 *  2. Pending message queue: subscribePost() called before onopen now queues
 *     the message and flushes it the moment onopen fires. No lost room joins.
 *  3. Token cached: /api/v1/auth/ws-token is fetched at most once per login
 *     session. Subsequent hook mounts reuse the promise.
 *  4. Token cache cleared on logout so the next login gets a fresh token.
 *  5. All wanted post rooms re-joined automatically on every reconnect.
 */

import { useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

// ─── Public types ─────────────────────────────────────────────────────────────

export type WsEventType =
  | "connected"
  | "notification:new"
  | "post:status_changed"
  | "post:code_ready"
  | "post:completed"
  | "post:cancelled";

type Handler<T = unknown> = (payload: T) => void;

// ─── Module-level singleton state ─────────────────────────────────────────────
// These live outside React so all hook instances share one socket.

let _ws: WebSocket | null = null;
let _wsToken: string | null = null;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _reconnectDelay = 1_000;
const MAX_RECONNECT = 30_000;

// type → Set<handler>
const _handlers = new Map<string, Set<Handler>>();

// Post rooms we want to be subscribed to (survives reconnects)
const _wantedRooms = new Set<string>();

// Messages queued while socket is CONNECTING; flushed in onopen
const _queue: string[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _safeSend(msg: string) {
  if (!_ws) return;
  if (_ws.readyState === WebSocket.OPEN) {
    _ws.send(msg);
  } else if (_ws.readyState === WebSocket.CONNECTING) {
    _queue.push(msg); // deferred until onopen
  }
  // CLOSING / CLOSED → silently drop; rooms will be rejoined on reconnect
}

function _dispatch(type: string, payload: unknown) {
  const set = _handlers.get(type);
  if (!set) return;
  for (const h of set) {
    try {
      h(payload);
    } catch (e) {
      console.error("[ws] handler threw:", e);
    }
  }
}

// ─── Connect / reconnect ──────────────────────────────────────────────────────

function _connect(token: string) {
  // Idempotent: if the socket is live (or connecting) with the same token → skip
  if (
    _wsToken === token &&
    _ws !== null &&
    (_ws.readyState === WebSocket.OPEN ||
      _ws.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  // Tear down any stale socket without triggering the reconnect path
  if (_ws) {
    _ws.onopen = null;
    _ws.onmessage = null;
    _ws.onerror = null;
    _ws.onclose = null;
    _ws.close();
    _ws = null;
  }

  _wsToken = token;
  _queue.length = 0;

  const url = `${process.env.NEXT_PUBLIC_WS_URL}?token=${encodeURIComponent(token)}`;
  let sock: WebSocket;
  try {
    sock = new WebSocket(url);
  } catch (err) {
    console.error("[ws] constructor failed:", err);
    _scheduleReconnect(token);
    return;
  }
  _ws = sock;

  sock.onopen = () => {
    _reconnectDelay = 1_000; // reset exponential backoff on success

    // Flush messages that were sent while we were CONNECTING
    while (_queue.length > 0) {
      sock.send(_queue.shift()!);
    }

    // Re-join every post room we care about (important after reconnect)
    for (const postId of _wantedRooms) {
      sock.send(
        JSON.stringify({ type: "subscribe_post", payload: { postId } }),
      );
    }
  };

  sock.onmessage = (ev) => {
    let msg: { type: string; payload: unknown };
    try {
      msg = JSON.parse(ev.data as string);
    } catch {
      return;
    }
    _dispatch(msg.type, msg.payload);
  };

  sock.onclose = (ev) => {
    if (ev.code === 4001) {
      // Server rejected auth — don't loop; user needs to re-login
      console.warn("[ws] server rejected auth (4001)");
      return;
    }
    _scheduleReconnect(token);
  };

  sock.onerror = () => {
    /* onclose always follows onerror */
  };
}

function _scheduleReconnect(token: string) {
  if (_reconnectTimer) return;
  _reconnectTimer = setTimeout(() => {
    _reconnectTimer = null;
    _reconnectDelay = Math.min(_reconnectDelay * 2, MAX_RECONNECT);
    _connect(token);
  }, _reconnectDelay);
}

function _disconnect() {
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }
  if (_ws) {
    _ws.onopen = null;
    _ws.onmessage = null;
    _ws.onerror = null;
    _ws.onclose = null;
    _ws.close();
    _ws = null;
  }
  _wsToken = null;
  _queue.length = 0;
}

// ─── Room management ──────────────────────────────────────────────────────────

function _subscribePost(postId: string) {
  _wantedRooms.add(postId);
  _safeSend(JSON.stringify({ type: "subscribe_post", payload: { postId } }));
}

function _unsubscribePost(postId: string) {
  _wantedRooms.delete(postId);
  _safeSend(JSON.stringify({ type: "unsubscribe_post", payload: { postId } }));
}

// ─── Token cache ──────────────────────────────────────────────────────────────
// One HTTP round-trip per login session. Cleared on logout.

let _tokenPromise: Promise<string | null> | null = null;

async function _fetchToken(): Promise<string | null> {
  if (_tokenPromise) return _tokenPromise;
  _tokenPromise = fetch("/api/v1/auth/ws-token")
    .then(async (r) => {
      if (!r.ok) return null;
      const j: { token: string | null } = await r.json();
      return j.token;
    })
    .catch(() => null);
  return _tokenPromise;
}

function _clearToken() {
  _tokenPromise = null;
}

// ─── React hook ───────────────────────────────────────────────────────────────

export function useRecashSocket() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_WS_URL) return;

    if (status === "authenticated" && session?.user?.id) {
      _fetchToken().then((token) => {
        if (token) _connect(token);
      });
    } else if (status === "unauthenticated") {
      _clearToken();
      _disconnect();
    }
  }, [status, session?.user?.id]);

  const on = useCallback(<T>(type: WsEventType, h: Handler<T>) => {
    let set = _handlers.get(type);
    if (!set) {
      set = new Set();
      _handlers.set(type, set);
    }
    set.add(h as Handler);
  }, []);

  const off = useCallback(<T>(type: WsEventType, h: Handler<T>) => {
    _handlers.get(type)?.delete(h as Handler);
  }, []);

  const subscribePost = useCallback(
    (postId: string) => _subscribePost(postId),
    [],
  );
  const unsubscribePost = useCallback(
    (postId: string) => _unsubscribePost(postId),
    [],
  );

  return { on, off, subscribePost, unsubscribePost };
}
