import { NextResponse } from "next/server";
import { redis } from "./redis";

export type RateLimitConfig = {
  limit?: number;
  windowSec?: number;
};

export type RateLimitResult =
  | { ok: true; remaining: number; reset: number }
  | { ok: false; remaining: 0; reset: number; response: NextResponse };

export async function rateLimit(
  identifier: string,
  { limit = 120, windowSec = 60 }: RateLimitConfig = {},
): Promise<RateLimitResult> {
  const key = `rl:${identifier}`;
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const windowStart = now - windowMs;

  try {
    const member = `${now}:${Math.random().toString(36).slice(2)}`;

    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, "-inf", windowStart);
    pipeline.zadd(key, now, member);
    pipeline.zcard(key);
    pipeline.expire(key, windowSec + 1);

    const results = await pipeline.exec();

    const count = (results?.[2]?.[1] as number) ?? 0;

    const resetAt = Math.ceil((now + windowMs) / 1000);

    if (count > limit) {
      return {
        ok: false,
        remaining: 0,
        reset: resetAt,
        response: NextResponse.json(
          { error: "Prea multe cereri. Încearcă din nou mai târziu." },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": String(limit),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(resetAt),
              "Retry-After": String(windowSec),
            },
          },
        ),
      };
    }

    return {
      ok: true,
      remaining: Math.max(0, limit - count),
      reset: resetAt,
    };
  } catch (err) {
    console.error("[rateLimit] Redis error — failing open:", err);
    return { ok: true, remaining: 0, reset: 0 };
  }
}

// Number of trusted reverse proxies in front of the app (e.g. 1 for a single
// nginx, 2 for CDN + nginx). The real client IP is the Nth entry counted from
// the RIGHT of X-Forwarded-For — everything to the left is client-supplied and
// spoofable, so we must never trust the leftmost value.
const TRUSTED_PROXY_HOPS = Math.max(
  1,
  parseInt(process.env.TRUSTED_PROXY_HOPS ?? "1", 10) || 1,
);

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      const idx = Math.max(0, parts.length - TRUSTED_PROXY_HOPS);
      return parts[idx];
    }
  }
  // x-real-ip is set by the trusted proxy to the actual peer, so it is safe.
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export const RL = {
  read: { limit: 180, windowSec: 60 },
  write: { limit: 60, windowSec: 60 },
  public: { limit: 60, windowSec: 60 },
} as const;
