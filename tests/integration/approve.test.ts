import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => ({
  auth: vi.fn(),
  rateLimit: vi.fn(),
  prisma: {
    post: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    claimRequest: {
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  redis: { set: vi.fn() },
  notifyClaimApproved: vi.fn(),
  notifyClaimDenied: vi.fn(),
  publishPostStatus: vi.fn(),
  publishToUser: vi.fn(),
  maybeEmailClaimApproved: vi.fn(),
  maybeEmailClaimDenied: vi.fn(),
  countPendingRequests: vi.fn(),
  resolvePendingRequests: vi.fn(),
  resolveCollectorPendingElsewhere: vi.fn(),
  invalidate: vi.fn(),
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
vi.mock("@/lib/claim-requests", () => ({
  countPendingRequests: h.countPendingRequests,
  resolvePendingRequests: h.resolvePendingRequests,
  resolveCollectorPendingElsewhere: h.resolveCollectorPendingElsewhere,
}));
vi.mock("@/lib/cache", () => ({
  invalidate: h.invalidate,
  CacheKey: { posts: (u: string, s: string) => `posts:${u}:${s}` },
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
    collectorId: null,
    bottleCount: 20,
    expiresAt: null,
    author: { name: "Ana" },
    ...overrides,
  };
}

function pendingRequest(overrides: Record<string, unknown> = {}) {
  return {
    status: "PENDING",
    createdAt: new Date(),
    collector: { name: "Bogdan" },
    ...overrides,
  };
}

const approveBody = { action: "approve", collectorId: COLLECTOR_ID };
const denyBody = { action: "deny", collectorId: COLLECTOR_ID };

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimit.mockResolvedValue({ ok: true });
  h.auth.mockResolvedValue({ user: { id: AUTHOR_ID } });
  h.prisma.post.findUnique.mockResolvedValue(claimedPost());
  h.prisma.post.findFirst.mockResolvedValue(null); // collector not busy
  h.prisma.post.update.mockResolvedValue({});
  h.prisma.post.updateMany.mockResolvedValue({ count: 1 });
  h.prisma.claimRequest.findUnique.mockResolvedValue(pendingRequest());
  h.prisma.claimRequest.update.mockResolvedValue({});
  h.prisma.claimRequest.count.mockResolvedValue(0);
  h.prisma.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: unknown) => unknown)(h.prisma)
      : Promise.all(arg as unknown[]),
  );
  h.redis.set.mockResolvedValue("OK");
  h.notifyClaimApproved.mockResolvedValue(undefined);
  h.notifyClaimDenied.mockResolvedValue(undefined);
  h.maybeEmailClaimApproved.mockResolvedValue(undefined);
  h.maybeEmailClaimDenied.mockResolvedValue(undefined);
  h.countPendingRequests.mockResolvedValue(0);
  h.resolvePendingRequests.mockResolvedValue([]);
  h.resolveCollectorPendingElsewhere.mockResolvedValue(undefined);
  h.invalidate.mockResolvedValue(undefined);
});

describe("POST /posts/[id]/approve", () => {
  it("rejects unauthenticated callers", async () => {
    h.auth.mockResolvedValue(null);
    const res = await POST(makeReq(approveBody), { params });
    expect(res.status).toBe(401);
  });

  it("rejects an invalid action", async () => {
    const res = await POST(
      makeReq({ action: "maybe", collectorId: COLLECTOR_ID }),
      { params },
    );
    expect(res.status).toBe(400);
  });

  it("rejects a missing collectorId", async () => {
    const res = await POST(makeReq({ action: "approve" }), { params });
    expect(res.status).toBe(400);
  });

  it("403s when the caller is not the author", async () => {
    h.auth.mockResolvedValue({ user: { id: COLLECTOR_ID } });
    const res = await POST(makeReq(approveBody), { params });
    expect(res.status).toBe(403);
  });

  it("409s when the post is not in CLAIMED state", async () => {
    h.prisma.post.findUnique.mockResolvedValue(claimedPost({ status: "OPEN" }));
    const res = await POST(makeReq(approveBody), { params });
    expect(res.status).toBe(409);
  });

  it("409s when the target request is no longer pending", async () => {
    h.prisma.claimRequest.findUnique.mockResolvedValue(
      pendingRequest({ status: "WITHDRAWN" }),
    );
    const res = await POST(makeReq(approveBody), { params });
    expect(res.status).toBe(409);
  });

  it("409s when the chosen collector is already busy elsewhere", async () => {
    h.prisma.post.findFirst.mockResolvedValue({ id: "other000000000000000000" });
    const res = await POST(makeReq(approveBody), { params });
    expect(res.status).toBe(409);
  });

  it("approves: IN_PROGRESS, stores a code, resolves the other requests", async () => {
    const res = await POST(makeReq(approveBody), { params });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("IN_PROGRESS");
    expect(json.deadline).toBeTruthy();

    expect(h.redis.set).toHaveBeenCalledTimes(1);
    const [key, code] = h.redis.set.mock.calls[0];
    expect(key).toBe(`code:${POST_ID}`);
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);

    // The rejected collectors are notified & their requests closed.
    expect(h.resolvePendingRequests).toHaveBeenCalledWith(
      POST_ID,
      "another_collector_chosen",
      COLLECTOR_ID,
    );
    // The approved collector's requests on other posts are retracted.
    expect(h.resolveCollectorPendingElsewhere).toHaveBeenCalledWith(
      COLLECTOR_ID,
      POST_ID,
    );
  });

  it("does not retract other requests when the request is declined", async () => {
    await POST(makeReq(denyBody), { params });
    expect(h.resolveCollectorPendingElsewhere).not.toHaveBeenCalled();
  });

  it("denies the last request: returns the post to OPEN, no code", async () => {
    h.prisma.claimRequest.count.mockResolvedValue(0);
    const res = await POST(makeReq(denyBody), { params });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("OPEN");
    expect(h.redis.set).not.toHaveBeenCalled();
  });

  it("denies one of several requests: post stays CLAIMED", async () => {
    h.prisma.claimRequest.count.mockResolvedValue(1);
    const res = await POST(makeReq(denyBody), { params });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("CLAIMED");
  });

  it("410s when approving an already-expired post", async () => {
    h.prisma.post.findUnique.mockResolvedValue(
      claimedPost({ expiresAt: new Date(Date.now() - 1000) }),
    );
    const res = await POST(makeReq(approveBody), { params });
    expect(res.status).toBe(410);
  });
});
