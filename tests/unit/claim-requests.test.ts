import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => ({
  prisma: {
    claimRequest: { findMany: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
    post: { findMany: vi.fn(), updateMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
  createNotification: vi.fn(),
  publishPostStatus: vi.fn(),
  publishToUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/notifications", () => ({
  createNotification: h.createNotification,
}));
vi.mock("@/lib/pubsub", () => ({
  publishPostStatus: h.publishPostStatus,
  publishToUser: h.publishToUser,
}));

import { resolveCollectorPendingElsewhere } from "@/lib/claim-requests";

const COLLECTOR_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const APPROVED_POST = "507f1f77bcf86cd799439011";
const OTHER_POST = "507f1f77bcf86cd799439022";
const OTHER_AUTHOR = "bbbbbbbbbbbbbbbbbbbbbbbb";

beforeEach(() => {
  vi.clearAllMocks();
  h.prisma.claimRequest.updateMany.mockResolvedValue({ count: 1 });
  h.prisma.post.updateMany.mockResolvedValue({ count: 1 });
  h.prisma.user.findUnique.mockResolvedValue({ name: "Bogdan" });
  h.prisma.post.findMany.mockResolvedValue([
    { id: OTHER_POST, authorId: OTHER_AUTHOR },
  ]);
  h.createNotification.mockResolvedValue(undefined);
});

describe("resolveCollectorPendingElsewhere", () => {
  it("does nothing when the collector has no other pending requests", async () => {
    h.prisma.claimRequest.findMany.mockResolvedValue([]);

    await resolveCollectorPendingElsewhere(COLLECTOR_ID, APPROVED_POST);

    expect(h.prisma.claimRequest.updateMany).not.toHaveBeenCalled();
    expect(h.prisma.post.updateMany).not.toHaveBeenCalled();
    expect(h.createNotification).not.toHaveBeenCalled();
  });

  it("excludes the approved post from the requests it retracts", async () => {
    h.prisma.claimRequest.findMany.mockResolvedValue([]);

    await resolveCollectorPendingElsewhere(COLLECTOR_ID, APPROVED_POST);

    expect(h.prisma.claimRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          collectorId: COLLECTOR_ID,
          status: "PENDING",
          postId: { not: APPROVED_POST },
        }),
      }),
    );
  });

  it("withdraws the other request and reopens a post left with none", async () => {
    h.prisma.claimRequest.findMany.mockResolvedValue([
      { id: "req1", postId: OTHER_POST },
    ]);
    h.prisma.claimRequest.count.mockResolvedValue(0);

    await resolveCollectorPendingElsewhere(COLLECTOR_ID, APPROVED_POST);

    expect(h.prisma.claimRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "WITHDRAWN" } }),
    );
    expect(h.prisma.post.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [OTHER_POST] }, status: "CLAIMED" },
        data: expect.objectContaining({ status: "OPEN" }),
      }),
    );
    expect(h.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: OTHER_AUTHOR }),
    );
    const [payload] = h.publishPostStatus.mock.calls[0];
    expect(payload).toMatchObject({ postId: OTHER_POST, status: "OPEN" });
  });

  it("keeps a post CLAIMED when other collectors still have requests", async () => {
    h.prisma.claimRequest.findMany.mockResolvedValue([
      { id: "req1", postId: OTHER_POST },
    ]);
    h.prisma.claimRequest.count.mockResolvedValue(2);

    await resolveCollectorPendingElsewhere(COLLECTOR_ID, APPROVED_POST);

    expect(h.prisma.post.updateMany).not.toHaveBeenCalled();
    const [payload] = h.publishPostStatus.mock.calls[0];
    expect(payload).toMatchObject({
      postId: OTHER_POST,
      status: "CLAIMED",
      pendingRequestCount: 2,
    });
  });

  it("handles several other pending requests in batched writes", async () => {
    const p2 = "507f1f77bcf86cd799439033";
    const p3 = "507f1f77bcf86cd799439044";
    h.prisma.claimRequest.findMany.mockResolvedValue([
      { id: "req1", postId: OTHER_POST },
      { id: "req2", postId: p2 },
      { id: "req3", postId: p3 },
    ]);
    h.prisma.claimRequest.count.mockResolvedValue(0);
    h.prisma.post.findMany.mockResolvedValue([
      { id: OTHER_POST, authorId: OTHER_AUTHOR },
      { id: p2, authorId: OTHER_AUTHOR },
      { id: p3, authorId: OTHER_AUTHOR },
    ]);

    await resolveCollectorPendingElsewhere(COLLECTOR_ID, APPROVED_POST);

    // Requests retracted and posts reopened in one write each, not per post.
    expect(h.prisma.claimRequest.updateMany).toHaveBeenCalledTimes(1);
    expect(h.prisma.post.updateMany).toHaveBeenCalledTimes(1);
    expect(h.prisma.post.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [OTHER_POST, p2, p3] }, status: "CLAIMED" },
      }),
    );
    // Each affected author is still notified individually.
    expect(h.createNotification).toHaveBeenCalledTimes(3);
    expect(h.publishPostStatus).toHaveBeenCalledTimes(3);
  });
});
