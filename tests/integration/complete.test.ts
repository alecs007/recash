import { describe, it, expect, beforeEach, vi } from "vitest";

// Shared mocks — hoisted so the vi.mock factories below can reference them.
const h = vi.hoisted(() => ({
  auth: vi.fn(),
  rateLimit: vi.fn(),
  prisma: {
    post: { findUnique: vi.fn(), update: vi.fn() },
    transaction: { create: vi.fn() },
    user: { update: vi.fn() },
    $transaction: vi.fn(),
  },
  redis: { get: vi.fn(), del: vi.fn() },
  notifyPostCompleted: vi.fn(),
  createNotification: vi.fn(),
  invalidate: vi.fn(),
  checkPostBadges: vi.fn(),
  checkTransactionBadges: vi.fn(),
  publishPostCompleted: vi.fn(),
  publishPostStatus: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: h.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/redis", () => ({ redis: h.redis }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: h.rateLimit,
  RL: { read: {}, write: {}, public: {} },
}));
vi.mock("@/lib/notifications", () => ({
  notifyPostCompleted: h.notifyPostCompleted,
  // Used by releaseTimedOutCollection when the window has expired.
  createNotification: h.createNotification,
}));
vi.mock("@/lib/cache", () => ({
  invalidate: h.invalidate,
  CacheKey: { profile: (id: string) => `profile:${id}` },
}));
vi.mock("@/lib/badges", () => ({
  checkPostBadges: h.checkPostBadges,
  checkTransactionBadges: h.checkTransactionBadges,
}));
vi.mock("@/lib/pubsub", () => ({
  publishPostCompleted: h.publishPostCompleted,
  publishPostStatus: h.publishPostStatus,
}));

import { POST } from "@/app/api/v1/posts/[id]/complete/route";

const POST_ID = "507f1f77bcf86cd799439011";
const COLLECTOR_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const AUTHOR_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";

const params = Promise.resolve({ id: POST_ID });

function makeReq(body: unknown) {
  return new Request(`http://localhost/api/v1/posts/${POST_ID}/complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function inProgressPost(overrides: Record<string, unknown> = {}) {
  return {
    id: POST_ID,
    status: "IN_PROGRESS",
    authorId: AUTHOR_ID,
    collectorId: COLLECTOR_ID,
    bottleCount: 100,
    collectorSharePercent: 30,
    expiresAt: null,
    claimedAt: new Date(),
    author: { id: AUTHOR_ID, name: "Ana", phone: null },
    collector: { id: COLLECTOR_ID, name: "Bogdan" },
    ...overrides,
  };
}

beforeEach(() => {
  h.rateLimit.mockResolvedValue({ ok: true });
  h.auth.mockResolvedValue({ user: { id: COLLECTOR_ID } });
  h.redis.get.mockResolvedValue("AB12");
  h.redis.del.mockResolvedValue(1);
  h.notifyPostCompleted.mockResolvedValue(undefined);
  h.createNotification.mockResolvedValue(undefined);
  h.prisma.post.update.mockResolvedValue({});
  h.invalidate.mockResolvedValue(undefined);
  h.checkPostBadges.mockResolvedValue(undefined);
  h.checkTransactionBadges.mockResolvedValue(undefined);
  // $transaction executes its callback against a tx that mirrors prisma.
  h.prisma.$transaction.mockImplementation(
    async (cb: (tx: unknown) => unknown) =>
      cb({
        post: { update: vi.fn().mockResolvedValue({}) },
        transaction: { create: h.prisma.transaction.create },
        user: { update: h.prisma.user.update },
      }),
  );
  h.prisma.transaction.create.mockResolvedValue({});
  h.prisma.user.update.mockResolvedValue({});
});

describe("POST /posts/[id]/complete", () => {
  it("rejects unauthenticated callers", async () => {
    h.auth.mockResolvedValue(null);
    const res = await POST(makeReq({ code: "AB12" }), { params });
    expect(res.status).toBe(401);
  });

  it("requires a confirmation code", async () => {
    const res = await POST(makeReq({}), { params });
    expect(res.status).toBe(400);
  });

  it("404s an invalid post id", async () => {
    const res = await POST(makeReq({ code: "AB12" }), {
      params: Promise.resolve({ id: "not-an-object-id" }),
    });
    expect(res.status).toBe(404);
  });

  it("409s when the post is not in progress", async () => {
    h.prisma.post.findUnique.mockResolvedValue(
      inProgressPost({ status: "OPEN" }),
    );
    const res = await POST(makeReq({ code: "AB12" }), { params });
    expect(res.status).toBe(409);
  });

  it("403s when the caller is not the assigned collector", async () => {
    h.prisma.post.findUnique.mockResolvedValue(inProgressPost());
    h.auth.mockResolvedValue({ user: { id: "cccccccccccccccccccccccc" } });
    const res = await POST(makeReq({ code: "AB12" }), { params });
    expect(res.status).toBe(403);
  });

  it("400s an incorrect code", async () => {
    h.prisma.post.findUnique.mockResolvedValue(inProgressPost());
    h.redis.get.mockResolvedValue("ZZZZ");
    const res = await POST(makeReq({ code: "AB12" }), { params });
    expect(res.status).toBe(400);
  });

  it("completes and splits the value on a valid (case-insensitive) code", async () => {
    h.prisma.post.findUnique.mockResolvedValue(inProgressPost());
    const res = await POST(makeReq({ code: "ab12" }), { params });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.transaction).toEqual({
      actualValue: 50,
      collectorEarning: 15,
      posterEarning: 35,
      bottleCount: 100,
    });

    // The transaction row is written with the same split.
    expect(h.prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          collectorEarning: 15,
          posterEarning: 35,
          actualValue: 50,
        }),
      }),
    );
    // The one-time code is consumed.
    expect(h.redis.del).toHaveBeenCalledWith(`code:${POST_ID}`);
  });

  it("410s and releases the collection when the window expired", async () => {
    h.prisma.post.findUnique.mockResolvedValue(
      inProgressPost({
        expiresAt: new Date(Date.now() - 1000),
        listingExpiresAt: null,
      }),
    );
    const res = await POST(makeReq({ code: "AB12" }), { params });
    expect(res.status).toBe(410);

    expect(h.prisma.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: POST_ID, status: "IN_PROGRESS" }),
        data: expect.objectContaining({ status: "OPEN", collectorId: null }),
      }),
    );
    // The one-time code is invalidated.
    expect(h.redis.del).toHaveBeenCalledWith(`code:${POST_ID}`);
    // Both participants are notified.
    expect(h.createNotification).toHaveBeenCalledTimes(2);
  });
});
