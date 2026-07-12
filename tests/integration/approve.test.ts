import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => ({
  auth: vi.fn(),
  rateLimit: vi.fn(),
  prisma: { post: { findUnique: vi.fn(), update: vi.fn() } },
  redis: { set: vi.fn() },
  notifyClaimApproved: vi.fn(),
  notifyClaimDenied: vi.fn(),
  publishPostStatus: vi.fn(),
  publishToUser: vi.fn(),
  maybeEmailClaimApproved: vi.fn(),
  maybeEmailClaimDenied: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: h.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/redis", () => ({ redis: h.redis }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: h.rateLimit,
  RL: { read: {}, write: {}, public: {} },
}));
vi.mock("@/lib/notifications", () => ({
  notifyClaimApproved: h.notifyClaimApproved,
  notifyClaimDenied: h.notifyClaimDenied,
}));
vi.mock("@/lib/pubsub", () => ({
  publishPostStatus: h.publishPostStatus,
  publishToUser: h.publishToUser,
}));
vi.mock("@/lib/email-optin", () => ({
  maybeEmailClaimApproved: h.maybeEmailClaimApproved,
  maybeEmailClaimDenied: h.maybeEmailClaimDenied,
}));

import { POST } from "@/app/api/v1/posts/[id]/approve/route";

const POST_ID = "507f1f77bcf86cd799439011";
const AUTHOR_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";
const COLLECTOR_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const params = Promise.resolve({ id: POST_ID });

function makeReq(body: unknown) {
  return new Request(`http://localhost/api/v1/posts/${POST_ID}/approve`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function claimedPost(overrides: Record<string, unknown> = {}) {
  return {
    id: POST_ID,
    status: "CLAIMED",
    authorId: AUTHOR_ID,
    collectorId: COLLECTOR_ID,
    bottleCount: 20,
    expiresAt: null,
    author: { name: "Ana" },
    collector: { name: "Bogdan" },
    ...overrides,
  };
}

beforeEach(() => {
  h.rateLimit.mockResolvedValue({ ok: true });
  h.auth.mockResolvedValue({ user: { id: AUTHOR_ID } });
  h.prisma.post.update.mockResolvedValue({});
  h.redis.set.mockResolvedValue("OK");
  h.notifyClaimApproved.mockResolvedValue(undefined);
  h.notifyClaimDenied.mockResolvedValue(undefined);
  h.maybeEmailClaimApproved.mockResolvedValue(undefined);
  h.maybeEmailClaimDenied.mockResolvedValue(undefined);
});

describe("POST /posts/[id]/approve", () => {
  it("rejects unauthenticated callers", async () => {
    h.auth.mockResolvedValue(null);
    const res = await POST(makeReq({ action: "approve" }), { params });
    expect(res.status).toBe(401);
  });

  it("rejects an invalid action", async () => {
    const res = await POST(makeReq({ action: "maybe" }), { params });
    expect(res.status).toBe(400);
  });

  it("403s when the caller is not the author", async () => {
    h.prisma.post.findUnique.mockResolvedValue(claimedPost());
    h.auth.mockResolvedValue({ user: { id: COLLECTOR_ID } });
    const res = await POST(makeReq({ action: "approve" }), { params });
    expect(res.status).toBe(403);
  });

  it("409s when the post is not in CLAIMED state", async () => {
    h.prisma.post.findUnique.mockResolvedValue(claimedPost({ status: "OPEN" }));
    const res = await POST(makeReq({ action: "approve" }), { params });
    expect(res.status).toBe(409);
  });

  it("approves: moves to IN_PROGRESS and stores a 4-char code", async () => {
    h.prisma.post.findUnique.mockResolvedValue(claimedPost());
    const res = await POST(makeReq({ action: "approve" }), { params });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("IN_PROGRESS");
    expect(json.deadline).toBeTruthy();

    expect(h.redis.set).toHaveBeenCalledTimes(1);
    const [key, code] = h.redis.set.mock.calls[0];
    expect(key).toBe(`code:${POST_ID}`);
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
  });

  it("denies: returns the post to OPEN without a code", async () => {
    h.prisma.post.findUnique.mockResolvedValue(claimedPost());
    const res = await POST(makeReq({ action: "deny" }), { params });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("OPEN");
    expect(h.redis.set).not.toHaveBeenCalled();
  });

  it("410s when approving an already-expired post", async () => {
    h.prisma.post.findUnique.mockResolvedValue(
      claimedPost({ expiresAt: new Date(Date.now() - 1000) }),
    );
    const res = await POST(makeReq({ action: "approve" }), { params });
    expect(res.status).toBe(410);
  });
});
