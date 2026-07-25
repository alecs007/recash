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
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
  notifyPostClaimed: vi.fn(),
  createNotification: vi.fn(),
  publishPostStatus: vi.fn(),
  maybeEmailCollectorRequest: vi.fn(),
  countPendingRequests: vi.fn(),
  resolvePendingRequests: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: h.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: h.rateLimit,
  RL: { read: {}, write: {}, public: {} },
}));
vi.mock("@/lib/notifications", () => ({
  notifyPostClaimed: h.notifyPostClaimed,
  createNotification: h.createNotification,
}));
vi.mock("@/lib/pubsub", () => ({ publishPostStatus: h.publishPostStatus }));
vi.mock("@/lib/email-optin", () => ({
  maybeEmailCollectorRequest: h.maybeEmailCollectorRequest,
}));
vi.mock("@/lib/claim-requests", () => ({
  MAX_PENDING_REQUESTS_PER_COLLECTOR: 5,
  countPendingRequests: h.countPendingRequests,
  resolvePendingRequests: h.resolvePendingRequests,
}));
vi.mock("@/lib/cache", () => ({
  invalidate: h.invalidate,
  invalidatePostLists: async () => {},
  CacheKey: { posts: (u: string, s: string) => `posts:${u}:${s}` },
}));

import { POST, DELETE } from "@/app/api/v1/posts/[id]/claim/route";

const POST_ID = "507f1f77bcf86cd799439011";
const AUTHOR_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";
const COLLECTOR_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const params = Promise.resolve({ id: POST_ID });

function makeReq() {
  return new Request(`http://localhost/api/v1/posts/${POST_ID}/claim`, {
    method: "POST",
  });
}

function openPost(overrides: Record<string, unknown> = {}) {
  return {
    id: POST_ID,
    status: "OPEN",
    authorId: AUTHOR_ID,
    collectorId: null,
    bottleCount: 20,
    expiresAt: null,
    availabilitySchedule: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimit.mockResolvedValue({ ok: true });
  h.auth.mockResolvedValue({ user: { id: COLLECTOR_ID } });
  h.prisma.post.findUnique.mockResolvedValue(openPost());
  h.prisma.post.findFirst.mockResolvedValue(null); // no in-progress collection
  h.prisma.post.update.mockResolvedValue({ status: "CLAIMED" });
  h.prisma.post.updateMany.mockResolvedValue({ count: 1 });
  h.prisma.claimRequest.count.mockResolvedValue(0);
  h.prisma.claimRequest.findUnique.mockResolvedValue(null); // no existing request
  h.prisma.claimRequest.upsert.mockResolvedValue({});
  h.prisma.claimRequest.updateMany.mockResolvedValue({ count: 1 });
  h.prisma.claimRequest.update.mockResolvedValue({});
  // Callback form runs against the same prisma mock; array form resolves all.
  h.prisma.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: unknown) => unknown)(h.prisma)
      : Promise.all(arg as unknown[]),
  );
  h.prisma.user.findUnique.mockResolvedValue({ name: "Bogdan" });
  h.notifyPostClaimed.mockResolvedValue(undefined);
  h.createNotification.mockResolvedValue(undefined);
  h.maybeEmailCollectorRequest.mockResolvedValue(undefined);
  h.countPendingRequests.mockResolvedValue(1);
  h.resolvePendingRequests.mockResolvedValue([]);
  h.invalidate.mockResolvedValue(undefined);
});

describe("POST /posts/[id]/claim (send request)", () => {
  it("rejects unauthenticated callers", async () => {
    h.auth.mockResolvedValue(null);
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(401);
  });

  it("404s an invalid post id", async () => {
    const res = await POST(makeReq(), {
      params: Promise.resolve({ id: "bad" }),
    });
    expect(res.status).toBe(404);
  });

  it("409s when a collector is already bound to the post", async () => {
    h.prisma.post.findUnique.mockResolvedValue(
      openPost({ status: "CLAIMED", collectorId: "someoneelse00000000000000" }),
    );
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(409);
  });

  it("409s when the post is IN_PROGRESS", async () => {
    h.prisma.post.findUnique.mockResolvedValue(
      openPost({ status: "IN_PROGRESS" }),
    );
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(409);
  });

  it("403s when trying to claim your own post", async () => {
    h.auth.mockResolvedValue({ user: { id: AUTHOR_ID } });
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(403);
  });

  it("409s when the collector has a collection in progress", async () => {
    h.prisma.post.findFirst.mockResolvedValue({ id: "inprogress0000000000000" });
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(409);
  });

  it("allows a second concurrent request (under the cap of 5)", async () => {
    h.prisma.claimRequest.count.mockResolvedValue(2);
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(200);
  });

  it("409s once the collector hits the cap of 5 pending requests", async () => {
    h.prisma.claimRequest.count.mockResolvedValue(5);
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(409);
  });

  it("410s when the post has expired", async () => {
    h.prisma.post.findUnique.mockResolvedValue(
      openPost({ expiresAt: new Date(Date.now() - 1000) }),
    );
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(410);
  });

  it("409s a duplicate pending request", async () => {
    h.prisma.claimRequest.findUnique.mockResolvedValue({ status: "PENDING" });
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(409);
  });

  it("409s when the author already declined this collector", async () => {
    h.prisma.claimRequest.findUnique.mockResolvedValue({ status: "DECLINED" });
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(409);
  });

  it("sends a request on an OPEN post and notifies the author", async () => {
    const res = await POST(makeReq(), { params });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      success: true,
      status: "CLAIMED",
      requestStatus: "PENDING",
    });
    expect(h.prisma.claimRequest.upsert).toHaveBeenCalled();
    expect(h.notifyPostClaimed).toHaveBeenCalled();
    // Collector identity is never broadcast on the shared post channel.
    const [payload] = h.publishPostStatus.mock.calls[0];
    expect(payload.collectorId).toBeUndefined();
    expect(payload.pendingRequestCount).toBe(1);
  });

  it("retires the request and 409s if the post was approved concurrently", async () => {
    // First read sees an open post; by the time we re-read after upserting,
    // the author has approved someone else (IN_PROGRESS, collector bound).
    h.prisma.post.findUnique
      .mockResolvedValueOnce(openPost())
      .mockResolvedValueOnce(
        openPost({ status: "IN_PROGRESS", collectorId: "winner0000000000000000000" }),
      );
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(409);
    // The just-created request must be retired, not left dangling as PENDING.
    expect(h.prisma.claimRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "RESOLVED" }),
      }),
    );
  });

  it("adds a second request to an already-CLAIMED post", async () => {
    h.prisma.post.findUnique.mockResolvedValue(
      openPost({ status: "CLAIMED", collectorId: null }),
    );
    h.countPendingRequests.mockResolvedValue(2);
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(200);
    // Already CLAIMED — the OPEN→CLAIMED transition must not run.
    expect(h.prisma.post.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /posts/[id]/claim (withdraw request)", () => {
  function makeDelReq() {
    return new Request(`http://localhost/api/v1/posts/${POST_ID}/claim`, {
      method: "DELETE",
    });
  }

  beforeEach(() => {
    h.prisma.post.findUnique.mockResolvedValue({
      id: POST_ID,
      authorId: AUTHOR_ID,
      status: "CLAIMED",
    });
    h.prisma.claimRequest.update.mockResolvedValue({});
  });

  it("rejects unauthenticated callers", async () => {
    h.auth.mockResolvedValue(null);
    const res = await DELETE(makeDelReq(), { params });
    expect(res.status).toBe(401);
  });

  it("withdraws the last request and returns the post to OPEN", async () => {
    h.prisma.claimRequest.count.mockResolvedValue(0);
    h.countPendingRequests.mockResolvedValue(0);
    const res = await DELETE(makeDelReq(), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("OPEN");
    expect(h.prisma.post.updateMany).toHaveBeenCalled();
  });

  it("keeps the post CLAIMED when other requests remain", async () => {
    h.prisma.claimRequest.count.mockResolvedValue(2);
    h.countPendingRequests.mockResolvedValue(2);
    const res = await DELETE(makeDelReq(), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("CLAIMED");
  });

  it("409s when there is no pending request to withdraw", async () => {
    // The conditional update misses (already approved / never existed).
    h.prisma.claimRequest.update.mockRejectedValue({ code: "P2025" });
    const res = await DELETE(makeDelReq(), { params });
    expect(res.status).toBe(409);
  });
});
