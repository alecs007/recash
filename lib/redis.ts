import Redis from "ioredis";

const createClient = () => {
  // Self-contained E2E: use an in-process Redis so tests need no external
  // server. Gated by REDIS_MOCK, which is never set in production. Loaded via a
  // runtime require so the dev-only package is never resolved or bundled into
  // the production build.
  if (process.env.REDIS_MOCK === "1") {
    const requireFn = eval("require") as NodeRequire;
    const RedisMock = requireFn("ioredis-mock");
    return new RedisMock();
  }

  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

  if (isBuildPhase) {
    return new Redis({ lazyConnect: true });
  }

  const client = new Redis(process.env.REDIS_URL!, {
    lazyConnect: true,
    maxRetriesPerRequest: 5,
    connectTimeout: 10000,
  });

  client.on("error", (err: Error) => {
    if (!isBuildPhase) {
      console.error("[Redis] Connection Error Detail:", err);
    }
  });

  return client;
};

declare global {
  var __redis: Redis | undefined;
}

export const redis: Redis = globalThis.__redis ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__redis = redis;
}
