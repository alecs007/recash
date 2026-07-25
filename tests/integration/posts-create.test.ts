import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => ({
  auth: vi.fn(),
  rateLimit: vi.fn(),
  prisma: {
    post: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
  invalidate: vi.fn(),
  checkPostBadges: vi.fn(),
  startExpiryLoop: vi.fn(),
  dispatchRadarNotifications: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: h.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: h.rateLimit,
  RL: { read: {}, write: {}, public: {} },
  getClientIp: () => "127.0.0.1",
}));
vi.mock("@/lib/cache", () => ({
  invalidate: h.invalidate,
  invalidatePostLists: async () => {},
  CacheKey: { posts: (id: string, status: string) => `posts:${id}:${status}` },
}));
vi.mock("@/lib/badges", () => ({ checkPostBadges: h.checkPostBadges }));
vi.mock("@/lib/expiry", () => ({ startExpiryLoop: h.startExpiryLoop }));
vi.mock("@/lib/radar", () => ({
  dispatchRadarNotifications: h.dispatchRadarNotifications,
}));

import { POST } from "@/app/api/v1/posts/route";

const USER_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";

const validBody = {
  bottleCount: 10,
  estimatedValue: 5,
  latitude: 44.4268,
  longitude: 26.1025,
  collectorSharePercent: 30,
};

function makeReq(body: unknown) {
  return new Request("http://localhost/api/v1/posts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  h.rateLimit.mockResolvedValue({ ok: true });
  h.auth.mockResolvedValue({ user: { id: USER_ID } });
  h.prisma.post.findFirst.mockResolvedValue(null);
  h.prisma.post.create.mockResolvedValue({
    id: "507f1f77bcf86cd799439011",
    status: "OPEN",
    createdAt: new Date(),
  });
  h.invalidate.mockResolvedValue(undefined);
  h.checkPostBadges.mockResolvedValue(undefined);
  h.dispatchRadarNotifications.mockResolvedValue(undefined);
});

describe("POST /posts", () => {
  it("rejects unauthenticated callers", async () => {
    h.auth.mockResolvedValue(null);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(401);
  });

  it("400s an invalid payload", async () => {
    const res = await POST(makeReq({ ...validBody, bottleCount: 0 }));
    expect(res.status).toBe(400);
    expect(h.prisma.post.create).not.toHaveBeenCalled();
  });

  it("409s when the user already has an active post", async () => {
    h.prisma.post.findFirst.mockResolvedValue({ id: "existing", status: "OPEN" });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.existingPostId).toBe("existing");
    expect(h.prisma.post.create).not.toHaveBeenCalled();
  });

  it("creates a post and returns 201", async () => {
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(201);

    expect(h.prisma.post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authorId: USER_ID,
          bottleCount: 10,
          collectorSharePercent: 30,
        }),
      }),
    );
    // Badge + radar side-effects are kicked off (fire-and-forget).
    expect(h.checkPostBadges).toHaveBeenCalledWith(USER_ID);
  });
});
