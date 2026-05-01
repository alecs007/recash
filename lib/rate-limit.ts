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

export const RL = {
  /** Standard read endpoints: 120 req / 60 s */
  read: { limit: 120, windowSec: 60 } satisfies RateLimitConfig,
  /** Write / mutation endpoints: 30 req / 60 s */
  write: { limit: 30, windowSec: 60 } satisfies RateLimitConfig,
} as const;
