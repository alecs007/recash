import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => ({
  auth: vi.fn(),
  rateLimit: vi.fn(),
  prisma: {
    post: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
  },
  notifyPostClaimed: vi.fn(),
  createNotification: vi.fn(),
  publishPostStatus: vi.fn(),
  maybeEmailCollectorRequest: vi.fn(),
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

import { POST } from "@/app/api/v1/posts/[id]/claim/route";

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
  h.rateLimit.mockResolvedValue({ ok: true });
  h.auth.mockResolvedValue({ user: { id: COLLECTOR_ID } });
  h.prisma.post.findFirst.mockResolvedValue(null); // no existing active collection
  h.prisma.post.update.mockResolvedValue({ status: "CLAIMED" });
  h.prisma.user.findUnique.mockResolvedValue({ name: "Bogdan" });
  h.notifyPostClaimed.mockResolvedValue(undefined);
  h.createNotification.mockResolvedValue(undefined);
  h.maybeEmailCollectorRequest.mockResolvedValue(undefined);
});

describe("POST /posts/[id]/claim", () => {
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

  it("409s when the post is not open", async () => {
    h.prisma.post.findUnique.mockResolvedValue(openPost({ status: "CLAIMED" }));
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(409);
  });

  it("403s when trying to claim your own post", async () => {
    h.prisma.post.findUnique.mockResolvedValue(openPost());
    h.auth.mockResolvedValue({ user: { id: AUTHOR_ID } });
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(403);
  });

  it("409s when the collector already has an active collection", async () => {
    h.prisma.post.findUnique.mockResolvedValue(openPost());
    h.prisma.post.findFirst.mockResolvedValue({ id: "someothercollection0000" });
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

  it("claims an open post and notifies the author", async () => {
    h.prisma.post.findUnique.mockResolvedValue(openPost());
    const res = await POST(makeReq(), { params });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ success: true, status: "CLAIMED" });

    expect(h.prisma.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "CLAIMED",
          collectorId: COLLECTOR_ID,
        }),
      }),
    );
    expect(h.notifyPostClaimed).toHaveBeenCalled();
  });
});
