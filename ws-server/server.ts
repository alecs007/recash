import "dotenv/config";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createClient } from "redis";
import { parse as parseUrl } from "url";

const PORT = parseInt(process.env.PORT ?? process.env.WS_PORT ?? "4001", 10);
const REDIS_URL = process.env.REDIS_URL;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "";

if (!REDIS_URL) {
  console.error("[ws] REDIS_URL env var is required");
  process.exit(1);
}

const HEARTBEAT_MS = 25_000;
const PONG_TIMEOUT_MS = 10_000;

// ─── Redis ────────────────────────────────────────────────────────────────────
// Two separate connections: a subscriber in pub/sub mode cannot run commands.

const subscriber = createClient({ url: REDIS_URL });
subscriber.on("error", (err) => console.error("[redis/sub]", err));

const redisCli = createClient({ url: REDIS_URL });
redisCli.on("error", (err) => console.error("[redis/cli]", err));

// ─── Connection registry ──────────────────────────────────────────────────────

const userSockets = new Map<string, Set<WebSocket>>();
const postSockets = new Map<string, Set<WebSocket>>();

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

// ─── Origin validation ────────────────────────────────────────────────────────

function isOriginAllowed(origin: string | undefined): boolean {
  if (!ALLOWED_ORIGIN) return true; // not configured → allow all
  if (!origin) return false;
  const allowed = ALLOWED_ORIGIN.split(",").map((o) =>
    o.trim().replace(/\/$/, ""),
  );
  return allowed.includes((origin ?? "").replace(/\/$/, ""));
}

// ─── Auth — Redis one-time token ──────────────────────────────────────────────

async function authenticate(req: IncomingMessage): Promise<string | null> {
  try {
    const { query } = parseUrl(req.url ?? "", true);
    const token = typeof query.token === "string" ? query.token : null;
    if (!token || token.length < 32) return null;

    // getDel is atomic: retrieves AND deletes in one round-trip (single-use token)
    const userId = await redisCli.getDel(`ws-token:${token}`);
    return userId ?? null;
  } catch (err) {
    console.error("[ws/auth]", err);
    return null;
  }
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

function schedulePing(ws: WebSocket) {
  const meta = socketMeta.get(ws);
  if (!meta) return;
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

// ─── Redis pub/sub dispatcher ─────────────────────────────────────────────────
// node-redis v4: pSubscribe callback is (message, channel) — message comes FIRST

function onPubSubMessage(message: string, channel: string) {
  if (channel.startsWith("recash:user:")) {
    broadcast(userSockets.get(channel.slice("recash:user:".length)), message);
  } else if (channel.startsWith("recash:post:")) {
    broadcast(postSockets.get(channel.slice("recash:post:".length)), message);
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
  if (!postId || typeof postId !== "string" || postId.length > 100) return;

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
  await Promise.all([subscriber.connect(), redisCli.connect()]);
  console.log("[ws] Redis connected");

  await subscriber.pSubscribe("recash:*", onPubSubMessage);
  console.log("[ws] subscribed to recash:* pattern");

  const httpServer = createServer(
    (_req: IncomingMessage, res: ServerResponse) => {
      if (_req.url === "/health") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("OK");
        return;
      }
      res.writeHead(404);
      res.end();
    },
  );

  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", async (req: IncomingMessage, socket, head) => {
    if (!isOriginAllowed(req.headers["origin"])) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    const userId = await authenticate(req);
    if (!userId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
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
        schedulePing(ws);
      });
      ws.on("close", () => cleanup(ws));
      ws.on("error", (err) => {
        console.error(`[ws] socket error user=${userId}:`, err);
        cleanup(ws);
      });
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`[ws] HTTP+WS server listening on port ${PORT}`);
  });

  const shutdown = async () => {
    console.log("[ws] shutting down");
    httpServer.close();
    wss.close();
    await Promise.all([subscriber.quit(), redisCli.quit()]);
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("[ws] fatal:", err);
  process.exit(1);
});
