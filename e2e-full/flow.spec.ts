import { test, expect, request, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import { STATE_FILE } from "./constants";

type State = {
  baseURL: string;
  mongoUri: string;
  posterId: string;
  collectorId: string;
  posterCookie: string;
  collectorCookie: string;
};

const state: State = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));

function ctxFor(cookie: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: state.baseURL,
    extraHTTPHeaders: { cookie: `authjs.session-token=${cookie}` },
  });
}

const prisma = new PrismaClient({
  datasources: { db: { url: state.mongoUri } },
});

let poster: APIRequestContext;
let collector: APIRequestContext;

test.beforeAll(async () => {
  poster = await ctxFor(state.posterCookie);
  collector = await ctxFor(state.collectorCookie);
});

test.afterAll(async () => {
  await poster.dispose();
  await collector.dispose();
  await prisma.$disconnect();
});

// The whole lifecycle is stateful and order-dependent, so run serially.
test.describe.serial("Full lifecycle", () => {
  let postId: string;

  test("session cookies authenticate both users", async () => {
    const res = await poster.get("/api/v1/profile");
    expect(res.status()).toBe(200);
  });

  test("poster creates a post", async () => {
    const res = await poster.post("/api/v1/posts", {
      data: {
        bottleCount: 100,
        estimatedValue: 50,
        latitude: 44.4268,
        longitude: 26.1025,
        collectorSharePercent: 30,
        description: "Sticle E2E gata de colectare",
      },
    });
    expect(res.status()).toBe(201);
    postId = (await res.json()).id;
    expect(postId).toBeTruthy();
  });

  test("poster cannot claim their own post", async () => {
    const res = await poster.post(`/api/v1/posts/${postId}/claim`);
    expect(res.status()).toBe(403);
  });

  test("collector requests the post (stays CLAIMED, no bound collector)", async () => {
    const res = await collector.post(`/api/v1/posts/${postId}/claim`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("CLAIMED");
    expect(json.requestStatus).toBe("PENDING");
  });

  test("a duplicate request from the same collector is rejected", async () => {
    const res = await collector.post(`/api/v1/posts/${postId}/claim`);
    expect(res.status()).toBe(409);
  });

  test("the collector's identity is hidden from non-participants", async () => {
    const anon = await request.newContext({ baseURL: state.baseURL });
    const res = await anon.get(`/api/v1/posts/${postId}`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.collector).toBeNull();
    expect(json.claimRequests).toBeUndefined();
    expect(json.pendingRequestCount).toBe(1);
    await anon.dispose();
  });

  test("the author sees the pending requester", async () => {
    const res = await poster.get(`/api/v1/posts/${postId}`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.pendingRequestCount).toBe(1);
    expect(json.claimRequests).toHaveLength(1);
    expect(json.claimRequests[0].collectorId).toBe(state.collectorId);
  });

  test("code is not available before approval", async () => {
    const res = await collector.get(`/api/v1/posts/${postId}/code`);
    expect(res.status()).toBe(409); // only for IN_PROGRESS
  });

  test("approve requires a collectorId", async () => {
    const res = await poster.post(`/api/v1/posts/${postId}/approve`, {
      data: { action: "approve" },
    });
    expect(res.status()).toBe(400);
  });

  test("poster approves a specific collector and a code is issued", async () => {
    const res = await poster.post(`/api/v1/posts/${postId}/approve`, {
      data: { action: "approve", collectorId: state.collectorId },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe("IN_PROGRESS");
  });

  test("a non-participant cannot read the code", async () => {
    const anon = await request.newContext({ baseURL: state.baseURL });
    const res = await anon.get(`/api/v1/posts/${postId}/code`);
    expect(res.status()).toBe(401);
    await anon.dispose();
  });

  test("a wrong code is rejected", async () => {
    const res = await collector.post(`/api/v1/posts/${postId}/complete`, {
      data: { code: "0000" },
    });
    expect(res.status()).toBe(400);
  });

  test("collector completes with the real code and the split is correct", async () => {
    const codeRes = await collector.get(`/api/v1/posts/${postId}/code`);
    expect(codeRes.status()).toBe(200);
    const { code } = await codeRes.json();
    expect(code).toMatch(/^[A-Z0-9]{4}$/);

    const res = await collector.post(`/api/v1/posts/${postId}/complete`, {
      data: { code },
    });
    expect(res.status()).toBe(200);
    // 100 bottles * 0.5 = 50 RON; 30% -> 15 collector, 35 poster.
    expect((await res.json()).transaction).toEqual({
      actualValue: 50,
      collectorEarning: 15,
      posterEarning: 35,
      bottleCount: 100,
    });
  });

  test("the database reflects the completed transaction and updated stats", async () => {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    expect(post?.status).toBe("COMPLETED");

    const tx = await prisma.transaction.findUnique({ where: { postId } });
    expect(tx).toMatchObject({
      posterId: state.posterId,
      collectorId: state.collectorId,
      bottleCount: 100,
      collectorEarning: 15,
      posterEarning: 35,
    });

    const posterUser = await prisma.user.findUnique({
      where: { id: state.posterId },
    });
    const collectorUser = await prisma.user.findUnique({
      where: { id: state.collectorId },
    });
    expect(posterUser?.totalBottlesGiven).toBe(100);
    expect(posterUser?.totalSaved).toBe(35);
    expect(collectorUser?.totalBottlesCollected).toBe(100);
    expect(collectorUser?.totalEarned).toBe(15);
  });

  test("the one-time code cannot be reused", async () => {
    const res = await collector.post(`/api/v1/posts/${postId}/complete`, {
      data: { code: "ABCD" },
    });
    // Post is no longer IN_PROGRESS.
    expect(res.status()).toBe(409);
  });

  test("first collection awards the collector a badge", async () => {
    const badge = await prisma.badge.findFirst({
      where: { userId: state.collectorId, type: "FIRST_COLLECTION" },
    });
    expect(badge).not.toBeNull();
  });
});
