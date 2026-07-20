import { describe, it, expect } from "vitest";
import {
  createPostSchema,
  reviewSchema,
  approveClaimSchema,
  RON_PER_BOTTLE,
} from "@/lib/validations/post";

const validPost = {
  bottleCount: 10,
  estimatedValue: 5,
  latitude: 44.4268,
  longitude: 26.1025,
};

describe("createPostSchema", () => {
  it("accepts a minimal valid payload and applies defaults", () => {
    const parsed = createPostSchema.parse(validPost);
    expect(parsed.collectorSharePercent).toBe(30);
    expect(parsed.description).toBe("");
    expect(parsed.images).toEqual([]);
    expect(parsed.expiresInHours).toBe(168);
    expect(parsed.availabilitySchedule).toBeNull();
  });

  it("exposes the SGR unit value", () => {
    expect(RON_PER_BOTTLE).toBe(0.5);
  });

  it("rejects non-integer or out-of-range bottle counts", () => {
    expect(createPostSchema.safeParse({ ...validPost, bottleCount: 0 }).success).toBe(
      false,
    );
    expect(
      createPostSchema.safeParse({ ...validPost, bottleCount: 1.5 }).success,
    ).toBe(false);
    expect(
      createPostSchema.safeParse({ ...validPost, bottleCount: 10001 }).success,
    ).toBe(false);
  });

  it("rejects non-positive or oversized estimated values", () => {
    expect(
      createPostSchema.safeParse({ ...validPost, estimatedValue: 0 }).success,
    ).toBe(false);
    expect(
      createPostSchema.safeParse({ ...validPost, estimatedValue: 5001 }).success,
    ).toBe(false);
  });

  it("clamps collector share to 0-100", () => {
    expect(
      createPostSchema.safeParse({ ...validPost, collectorSharePercent: -1 })
        .success,
    ).toBe(false);
    expect(
      createPostSchema.safeParse({ ...validPost, collectorSharePercent: 101 })
        .success,
    ).toBe(false);
    expect(
      createPostSchema.safeParse({ ...validPost, collectorSharePercent: 50 })
        .success,
    ).toBe(true);
  });

  it("rejects out-of-range coordinates", () => {
    expect(createPostSchema.safeParse({ ...validPost, latitude: 91 }).success).toBe(
      false,
    );
    expect(
      createPostSchema.safeParse({ ...validPost, longitude: -181 }).success,
    ).toBe(false);
  });

  it("blocks emails, links and phone numbers in the description", () => {
    for (const description of [
      "Scrie-mi pe test@example.com",
      "Detalii aici https://example.com/oferta",
      "Sună la 0721234567",
      "www.example.com",
    ]) {
      const res = createPostSchema.safeParse({ ...validPost, description });
      expect(res.success, description).toBe(false);
    }
  });

  it("allows a clean description", () => {
    const res = createPostSchema.safeParse({
      ...validPost,
      description: "Sticle curate, gata de colectare.",
    });
    expect(res.success).toBe(true);
  });

  it("rejects more than 5 images and invalid urls", () => {
    expect(
      createPostSchema.safeParse({
        ...validPost,
        images: Array(6).fill("https://example.com/a.jpg"),
      }).success,
    ).toBe(false);
    expect(
      createPostSchema.safeParse({ ...validPost, images: ["not-a-url"] }).success,
    ).toBe(false);
  });

  it("normalizes an empty phone to null", () => {
    const parsed = createPostSchema.parse({ ...validPost, phone: "" });
    expect(parsed.phone).toBeNull();
  });
});

describe("reviewSchema", () => {
  it("accepts ratings 1-5", () => {
    expect(reviewSchema.safeParse({ rating: 1 }).success).toBe(true);
    expect(reviewSchema.safeParse({ rating: 5 }).success).toBe(true);
  });

  it("rejects ratings outside 1-5", () => {
    expect(reviewSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: 6 }).success).toBe(false);
  });
});

describe("approveClaimSchema", () => {
  const collectorId = "507f1f77bcf86cd799439011";

  it("accepts approve/deny with a valid collectorId", () => {
    expect(
      approveClaimSchema.safeParse({ action: "approve", collectorId }).success,
    ).toBe(true);
    expect(
      approveClaimSchema.safeParse({ action: "deny", collectorId }).success,
    ).toBe(true);
  });

  it("rejects an invalid action", () => {
    expect(
      approveClaimSchema.safeParse({ action: "maybe", collectorId }).success,
    ).toBe(false);
  });

  it("requires a valid collectorId", () => {
    expect(approveClaimSchema.safeParse({ action: "approve" }).success).toBe(
      false,
    );
    expect(
      approveClaimSchema.safeParse({ action: "approve", collectorId: "nope" })
        .success,
    ).toBe(false);
  });
});
