/**
 * ws-server/server.ts  (v2)
 *
 * Standalone WebSocket server. Runs as a separate Render service.
 * Bridges Redis Pub/Sub → connected browser WebSocket clients.
 *
 * Bug fixed vs v1:
 *   node-redis v4 pSubscribe callback signature is (message, channel),
 *   NOT (channel, message). Previous code dispatched to the wrong key,
 *   so NO messages ever reached any client.
 */

import "dotenv/config";
import { WebSocketServer, WebSocket } from "ws";
import { createClient } from "redis";
import { PrismaClient } from "@prisma/client";
import { IncomingMessage } from "http";
import { parse as parseUrl } from "url";

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.WS_PORT ?? "4001", 10);
const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.error("[ws] REDIS_URL env var is required");
  process.exit(1);
}

const HEARTBEAT_MS = 25_000; // ping every 25 s
const PONG_TIMEOUT_MS = 10_000; // terminate if no pong within 10 s

// ─── Prisma (session lookup for auth) ────────────────────────────────────────

const prisma = new PrismaClient({ log: ["error"] });

// ─── Redis subscriber (dedicated connection — must not share with publisher) ──

const subscriber = createClient({ url: REDIS_URL });
subscriber.on("error", (err) => console.error("[redis/sub]", err));

// ─── Connection registry ──────────────────────────────────────────────────────

const userSockets = new Map<string, Set<WebSocket>>(); // userId → sockets
const postSockets = new Map<string, Set<WebSocket>>(); // postId → sockets

interface SocketMeta {
  userId: string;
  postIds: Set<string>;
  pingTimer?: ReturnType<typeof setTimeout>;
  pongKillTimer?: ReturnType<typeof setTimeout>;
}
const socketMeta = new WeakMap<WebSocket, SocketMeta>();

// ─── Registry helpers ─────────────────────────────────────────────────────────

function roomAdd<K>(map: Map<K, Set<WebSocket>>, key: K, ws: WebSocket) {
  let s = map.get(key);
  if (!s) {
    s = new Set();
    map.set(key, s);
  }
  s.add(ws);
}

function roomDel<K>(map: Map<K, Set<WebSocket>>, key: K, ws: WebSocket) {
  const s = map.get(key);
  if (!s) return;
  s.delete(ws);
  if (s.size === 0) map.delete(key);
}

function broadcast(sockets: Set<WebSocket> | undefined, msg: string) {
  if (!sockets) return;
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function authenticate(req: IncomingMessage): Promise<string | null> {
  try {
    const { query } = parseUrl(req.url ?? "", true);
    const token = typeof query.token === "string" ? query.token : null;
    if (!token) return null;

    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      select: { userId: true, expires: true },
    });
    if (!session || session.expires < new Date()) return null;
    return session.userId;
  } catch (err) {
    console.error("[ws/auth]", err);
    return null;
  }
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

function schedulePing(ws: WebSocket) {
  const meta = socketMeta.get(ws);
  if (!meta) return;

  // Clear any existing timers
  if (meta.pingTimer) clearTimeout(meta.pingTimer);
  if (meta.pongKillTimer) clearTimeout(meta.pongKillTimer);

  meta.pingTimer = setTimeout(() => {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.ping();

    meta.pongKillTimer = setTimeout(() => {
      console.log(`[ws] no pong from user=${meta.userId}, terminating`);
      ws.terminate();
    }, PONG_TIMEOUT_MS);
  }, HEARTBEAT_MS);
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

function cleanup(ws: WebSocket) {
  const meta = socketMeta.get(ws);
  if (!meta) return;

  if (meta.pingTimer) clearTimeout(meta.pingTimer);
  if (meta.pongKillTimer) clearTimeout(meta.pongKillTimer);

  roomDel(userSockets, meta.userId, ws);
  for (const postId of meta.postIds) roomDel(postSockets, postId, ws);

  socketMeta.delete(ws);
}

// ─── Redis message dispatcher ─────────────────────────────────────────────────
//
// node-redis v4 pSubscribe callback: (message: string, channel: string)
// NOTE: message comes FIRST, channel comes SECOND — opposite of what you'd expect!

function onPubSubMessage(message: string, channel: string) {
  if (channel.startsWith("recash:user:")) {
    const userId = channel.slice("recash:user:".length);
    broadcast(userSockets.get(userId), message);
  } else if (channel.startsWith("recash:post:")) {
    const postId = channel.slice("recash:post:".length);
    broadcast(postSockets.get(postId), message);
  }
}

// ─── Client → server messages ─────────────────────────────────────────────────

function handleClientMessage(ws: WebSocket, raw: string) {
  const meta = socketMeta.get(ws);
  if (!meta) return;

  let msg: { type: string; payload?: { postId?: string } };
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  const postId = msg.payload?.postId;
  if (!postId) return;

  if (msg.type === "subscribe_post") {
    meta.postIds.add(postId);
    roomAdd(postSockets, postId, ws);
  } else if (msg.type === "unsubscribe_post") {
    meta.postIds.delete(postId);
    roomDel(postSockets, postId, ws);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await subscriber.connect();
  console.log("[ws] Redis subscriber connected");

  // node-redis v4: pSubscribe(pattern, callback(message, channel))
  await subscriber.pSubscribe("recash:*", onPubSubMessage);
  console.log("[ws] subscribed to recash:* pattern");

  const wss = new WebSocketServer({ port: PORT });
  console.log(`[ws] listening on port ${PORT}`);

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const userId = await authenticate(req);
    if (!userId) {
      ws.close(4001, "Unauthorized");
      return;
    }

    const meta: SocketMeta = { userId, postIds: new Set() };
    socketMeta.set(ws, meta);
    roomAdd(userSockets, userId, ws);

    ws.send(JSON.stringify({ type: "connected", payload: { userId } }));
    schedulePing(ws);

    ws.on("message", (data) => handleClientMessage(ws, data.toString()));
    ws.on("pong", () => {
      const m = socketMeta.get(ws);
      if (m?.pongKillTimer) {
        clearTimeout(m.pongKillTimer);
        m.pongKillTimer = undefined;
      }
      schedulePing(ws); // schedule next ping cycle
    });
    ws.on("close", () => cleanup(ws));
    ws.on("error", (err) => {
      console.error(`[ws] socket error user=${userId}:`, err);
      cleanup(ws);
    });
  });

  const shutdown = async () => {
    console.log("[ws] shutting down");
    wss.close();
    await subscriber.quit();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("[ws] fatal:", err);
  process.exit(1);
});
