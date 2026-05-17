"use client";

import { useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

export type WsEventType =
  | "connected"
  | "notification:new"
  | "post:status_changed"
  | "post:code_ready"
  | "post:completed"
  | "post:cancelled"
  | "post:rating_updated";

type Handler<T = unknown> = (payload: T) => void;

let _ws: WebSocket | null = null;
let _wsToken: string | null = null;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _reconnectDelay = 1_000;
const MAX_RECONNECT = 30_000;

const _handlers = new Map<string, Set<Handler>>();
const _wantedRooms = new Set<string>();
const _queue: string[] = [];

function _safeSend(msg: string) {
  if (!_ws) return;
  if (_ws.readyState === WebSocket.OPEN) {
    _ws.send(msg);
  } else if (_ws.readyState === WebSocket.CONNECTING) {
    _queue.push(msg);
  }
  // CLOSING / CLOSED → drop; rooms re-joined on next reconnect
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

let _connecting = false;
function _connect(token: string) {
  // Idempotent: skip if we already have a live socket with this exact token.
  if (_connecting) return; // ← guard concurrent calls
  if (
    _wsToken === token &&
    _ws !== null &&
    (_ws.readyState === WebSocket.OPEN ||
      _ws.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  _connecting = true;

  // Tear down any stale socket without triggering the reconnect path.
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
    _wsToken = null;
    _scheduleReconnect();
    return;
  }
  _ws = sock;

  sock.onopen = () => {
    _connecting = false; // ← release
    _reconnectDelay = 1_000; // reset back-off on success

    // Flush messages queued while CONNECTING
    while (_queue.length > 0) {
      sock.send(_queue.shift()!);
    }

    // Re-join every post room (critical after reconnect)
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

  sock.onerror = () => {
    /* onclose always follows onerror — handled there */
  };

  sock.onclose = (ev) => {
    _connecting = false; // ← release on failure too
    _tokenPromise = null;
    _wsToken = null;

    if (ev.code === 4001) {
      // Server explicitly rejected auth — don't loop, user needs to re-login.
      console.warn("[ws] server rejected auth (4001)");
      return;
    }

    _scheduleReconnect();
  };
}

// ─── Reconnect ────────────────────────────────────────────────────────────────
// Async so it can fetch a fresh token before connecting.

function _scheduleReconnect() {
  if (_reconnectTimer) return;
  _reconnectTimer = setTimeout(async () => {
    _reconnectTimer = null;
    _reconnectDelay = Math.min(_reconnectDelay * 2, MAX_RECONNECT);

    const token = await _fetchToken();
    if (token) _connect(token);
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
  _tokenPromise = null;
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

// ─── Token fetching ───────────────────────────────────────────────────────────
// Deduplicated per connection attempt: multiple hook instances on the same
// mount share one promise.  Cleared on socket close so reconnects get a fresh
// single-use token.

let _tokenPromise: Promise<string | null> | null = null;

async function _fetchToken(): Promise<string | null> {
  if (_tokenPromise) return _tokenPromise;

  _tokenPromise = fetch("/api/v1/auth/ws-token")
    .then(async (r) => {
      if (!r.ok) return null;
      const j = (await r.json()) as { token: string | null };
      return j.token;
    })
    .catch(() => null);

  return _tokenPromise;
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
      _tokenPromise = null;
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
