import { redis } from "./redis";

export async function cached<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    const raw = await redis.get(key);
    if (raw !== null) {
      console.log(`[cache] hit: ${key}`);
      return JSON.parse(raw) as T;
    }
  } catch (err) {
    console.error("[cache] get error:", err);
  }

  const value = await fn();

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttl);
  } catch (err) {
    console.error("[cache] set error:", err);
  }

  return value;
}

export async function invalidate(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    console.error("[cache] invalidate error:", err);
  }
}

export const CacheKey = {
  profile: (userId: string) => `profile:${userId}`,

  posts: (userId: string, status: string) =>
    `profile:${userId}:posts:${status}`,

  transactions: (userId: string, page: number, limit: number, side: string) =>
    `profile:${userId}:tx:${page}:${limit}:${side}`,

  badges: (userId: string) => `profile:${userId}:badges`,

  // Notifications have a very short TTL and are explicitly invalidated on
  // PATCH, so we include the unreadOnly flag in the key too.
  notifications: (
    userId: string,
    page: number,
    limit: number,
    unread: boolean,
  ) => `profile:${userId}:notif:${page}:${limit}:${unread ? "1" : "0"}`,
} as const;

export const TTL = {
  profile: 60, // invalidated on PATCH
  posts: 30, // mutations happen via separate routes
  transactions: 60,
  badges: 300, // changes very rarely
  notifications: 15, // short; also invalidated on PATCH
} as const;
