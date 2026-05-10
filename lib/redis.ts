import Redis from "ioredis";

const createClient = () => {
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
