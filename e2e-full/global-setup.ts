import { MongoMemoryReplSet } from "mongodb-memory-server";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { execSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import {
  E2E_PORT,
  E2E_BASE_URL,
  AUTH_SECRET,
  COOKIE_NAME,
  STATE_FILE,
} from "./constants";

/**
 * Full-flow E2E bootstrap: an isolated, ephemeral backend (in-memory MongoDB
 * replica set + in-process Redis) with two seeded users and signed NextAuth JWT
 * session cookies. Nothing here touches the real Atlas/Upstash backend; the
 * returned function tears it all down.
 *
 * The app uses the JWT session strategy, so a cookie encoded with the same
 * AUTH_SECRET is a valid session — no Google OAuth round-trip needed.
 */

async function mintCookie(user: {
  id: string;
  role: string;
  name: string | null;
  email: string | null;
}) {
  return encode({
    salt: COOKIE_NAME,
    secret: AUTH_SECRET,
    token: {
      sub: user.id,
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    },
  });
}

async function waitForServer(url: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.status < 500) return;
    } catch {
      // server not up yet — keep polling
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server at ${url} did not become ready in ${timeoutMs}ms`);
}

export default async function globalSetup() {
  // A replica set is required for Prisma's $transaction. Connect with
  // directConnection=true (and no replicaSet param): a single-node replica set
  // still supports transactions, but topology discovery against the ephemeral
  // host would otherwise hang Prisma. Collections are created on first write.
  const mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  const rawUri = mongo.getUri();
  const uri = `${rawUri.split("?")[0]}recash_e2e?directConnection=true`;

  const prisma = new PrismaClient({ datasources: { db: { url: uri } } });
  const poster = await prisma.user.create({
    data: { email: "poster@e2e.test", name: "E2E Poster", role: "BOTH" },
  });
  const collector = await prisma.user.create({
    data: { email: "collector@e2e.test", name: "E2E Collector", role: "BOTH" },
  });
  await prisma.$disconnect();

  const posterCookie = await mintCookie(poster);
  const collectorCookie = await mintCookie(collector);

  // dotenv does not override variables already in the environment, so these win
  // over .env.local — the app talks to the isolated backend, not production.
  const server: ChildProcess = spawn(
    "pnpm",
    ["exec", "next", "dev", "--port", String(E2E_PORT)],
    {
      env: {
        ...process.env,
        RECASH_DATABASE_URI: uri,
        REDIS_MOCK: "1",
        AUTH_SECRET,
        NEXT_PUBLIC_API_VERSION: "v1",
      },
      stdio: "inherit",
      shell: true,
    },
  );

  await waitForServer(E2E_BASE_URL, 120_000);

  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify({
      baseURL: E2E_BASE_URL,
      mongoUri: uri,
      posterId: poster.id,
      collectorId: collector.id,
      posterCookie,
      collectorCookie,
    }),
  );

  return async () => {
    if (server.pid) {
      try {
        // Kill the whole tree on Windows; SIGTERM elsewhere.
        if (process.platform === "win32") {
          execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: "ignore" });
        } else {
          server.kill("SIGTERM");
        }
      } catch {
        // already gone
      }
    }
    await mongo.stop();
    fs.rmSync(STATE_FILE, { force: true });
  };
}
