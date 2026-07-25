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

// The "my posts" / "my transactions" lists are cached per (page, limit, filter),
// so their exact keys can't be enumerated for deletion. Instead each user has a
// monotonic version stamp folded into the cache key; bumping it makes every
// previously-cached variant unreachable at once (the stale entries then lapse
// via their own TTL).
function versionKey(userId: string, scope: string): string {
  return `profile:${userId}:${scope}:ver`;
}

export async function getCacheVersion(
  userId: string,
  scope: string,
): Promise<string> {
  try {
    return (await redis.get(versionKey(userId, scope))) ?? "0";
  } catch {
    return "0";
  }
}

export async function bumpCacheVersion(
  userId: string,
  scope: string,
): Promise<void> {
  try {
    await redis.incr(versionKey(userId, scope));
  } catch (err) {
    console.error(`[cache] bump ${scope} version error:`, err);
  }
}

/**
 * Invalidate everything that changes when a post's state changes, for every
 * affected user at once: their paginated "my posts" list (via version bump) and
 * their profile summary (recent posts + counts). Call this from every post
 * mutation with all affected user ids (author, and collector when bound).
 */
export async function invalidatePostLists(
  ...userIds: (string | null | undefined)[]
): Promise<void> {
  const ids = [...new Set(userIds.filter((u): u is string => !!u))];
  await Promise.all(
    ids.flatMap((id) => [
      bumpCacheVersion(id, "posts"),
      invalidate(CacheKey.profile(id)),
    ]),
  );
}

export const CacheKey = {
  profile: (userId: string) => `profile:${userId}`,

  posts: (
    userId: string,
    status: string,
    page = 0,
    limit = 0,
    version = "0",
  ) => `profile:${userId}:posts:v${version}:${status}:${page}:${limit}`,

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
  notifications: 8, // short; also invalidated on PATCH
} as const;
