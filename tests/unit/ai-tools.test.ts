import { describe, it, expect } from "vitest";
import {
  estimateEarnings,
  haversineKm,
  recashTools,
  findTool,
  anthropicToolDefinitions,
  toAnthropicSchema,
  SGR_VALUE_PER_BOTTLE,
  type ToolContext,
} from "@/lib/ai/tools";

// A fetch stub that maps URL substrings to JSON payloads.
function stubFetch(routes: Record<string, unknown>): typeof fetch {
  return (async (input: string | URL) => {
    const url = String(input);
    const match = Object.keys(routes).find((k) => url.includes(k));
    if (!match) throw new Error(`unexpected fetch: ${url}`);
    return {
      ok: true,
      status: 200,
      json: async () => routes[match],
    } as Response;
  }) as unknown as typeof fetch;
}

const CLUJ = { lat: 46.7712, lng: 23.6236 };

describe("estimateEarnings (pure)", () => {
  it("uses the fixed 0.5 RON SGR deposit", () => {
    expect(SGR_VALUE_PER_BOTTLE).toBe(0.5);
    const e = estimateEarnings(240, 60);
    expect(e).toEqual({
      bottleCount: 240,
      sgrValuePerBottle: 0.5,
      actualValue: 120,
      collectorSharePercent: 60,
      collectorEarning: 72,
      posterEarning: 48,
      currency: "RON",
    });
  });

  it("rounds the collector cut to 0.5 and keeps the split whole", () => {
    // 7 bottles -> 3.5 RON, 30% = 1.05 -> rounds to 1.0
    const e = estimateEarnings(7, 30);
    expect(e.collectorEarning).toBe(1);
    expect(e.posterEarning).toBe(2.5);
    expect(e.collectorEarning + e.posterEarning).toBeCloseTo(e.actualValue, 10);
  });
});

describe("haversineKm", () => {
  it("is zero for identical points", () => {
    expect(haversineKm(CLUJ.lat, CLUJ.lng, CLUJ.lat, CLUJ.lng)).toBe(0);
  });

  it("is symmetric", () => {
    const a = haversineKm(44.4, 26.1, 45.6, 25.5);
    const b = haversineKm(45.6, 25.5, 44.4, 26.1);
    expect(a).toBeCloseTo(b, 10);
  });

  it("approximates the Bucharest–Cluj distance (~325 km)", () => {
    const d = haversineKm(44.4268, 26.1025, 46.7712, 23.6236);
    expect(d).toBeGreaterThan(300);
    expect(d).toBeLessThan(350);
  });
});

describe("catalog wiring", () => {
  it("exposes six uniquely-named read-only tools", () => {
    expect(recashTools).toHaveLength(6);
    const names = recashTools.map((t) => t.name);
    expect(new Set(names).size).toBe(6);
    expect(names).toContain("search_listings");
    expect(names).toContain("get_platform_stats");
  });

  it("builds Anthropic schemas without a $schema key and with required fields", () => {
    const defs = anthropicToolDefinitions();
    expect(defs).toHaveLength(6);
    for (const d of defs) {
      expect(d.input_schema).not.toHaveProperty("$schema");
      expect(d.input_schema.type).toBe("object");
    }
    const getListing = defs.find((d) => d.name === "get_listing")!;
    expect(getListing.input_schema.required).toEqual(["id"]);
  });

  it("get_platform_stats has an empty required list", () => {
    const schema = toAnthropicSchema(findTool("get_platform_stats")!);
    expect(schema.required ?? []).toEqual([]);
  });
});

describe("estimate_earnings tool via catalog", () => {
  it("returns the same breakdown as the pure helper", async () => {
    const tool = findTool("estimate_earnings")!;
    const ctx: ToolContext = { apiBase: "http://test" };
    const result = await tool.execute(
      { bottleCount: 100, collectorSharePercent: 30 },
      ctx,
    );
    expect(result).toEqual(estimateEarnings(100, 30));
  });
});

describe("search_listings tool", () => {
  const posts = [
    {
      id: "a".repeat(24),
      status: "OPEN",
      bottleCount: 300,
      estimatedValue: 150,
      collectorSharePercent: 60,
      latitude: 46.7715, // ~a few hundred metres from Cluj centre
      longitude: 23.624,
      locationName: "Cluj-Napoca",
      pendingRequestCount: 0,
      author: { name: "Ana", reputationScore: 4.8, ratingCount: 12 },
      createdAt: "2026-07-20T10:00:00.000Z",
    },
    {
      id: "b".repeat(24),
      status: "OPEN",
      bottleCount: 40,
      estimatedValue: 20,
      collectorSharePercent: 50,
      latitude: 44.4268, // Bucharest — ~325 km away
      longitude: 26.1025,
      locationName: "București",
      pendingRequestCount: 2,
      author: { name: "Barbu", reputationScore: 4.1, ratingCount: 3 },
      createdAt: "2026-07-21T10:00:00.000Z",
    },
  ];

  const ctx: ToolContext = {
    apiBase: "http://test",
    fetchImpl: stubFetch({ "/api/v1/posts": { posts } }),
  };

  it("ranks by proximity and computes an approximate distance", async () => {
    const tool = findTool("search_listings")!;
    const res = (await tool.execute(
      { latitude: CLUJ.lat, longitude: CLUJ.lng },
      ctx,
    )) as { count: number; listings: { locationName: string; distanceKm: number }[] };

    expect(res.count).toBe(2);
    expect(res.listings[0].locationName).toBe("Cluj-Napoca");
    expect(res.listings[0].distanceKm).toBeLessThan(1);
    expect(res.listings[1].distanceKm).toBeGreaterThan(300);
  });

  it("applies the radius filter around the origin", async () => {
    const tool = findTool("search_listings")!;
    const res = (await tool.execute(
      { latitude: CLUJ.lat, longitude: CLUJ.lng, radiusKm: 5 },
      ctx,
    )) as { count: number; listings: { locationName: string }[] };

    expect(res.count).toBe(1);
    expect(res.listings[0].locationName).toBe("Cluj-Napoca");
  });

  it("applies the minBottles filter", async () => {
    const tool = findTool("search_listings")!;
    const res = (await tool.execute({ minBottles: 100 }, ctx)) as {
      count: number;
      listings: { bottleCount: number }[];
    };
    expect(res.count).toBe(1);
    expect(res.listings[0].bottleCount).toBe(300);
  });

  it("does not leak exact addresses (only approximate coords)", async () => {
    const tool = findTool("search_listings")!;
    const res = (await tool.execute({}, ctx)) as {
      listings: Record<string, unknown>[];
    };
    for (const l of res.listings) {
      expect(l).not.toHaveProperty("address");
      expect(l).toHaveProperty("approxLatitude");
    }
  });
});

describe("get_platform_stats tool", () => {
  it("passes through the /stats payload", async () => {
    const stats = {
      bottlesRecycled: 1234,
      completedExchanges: 56,
      activeListings: 7,
      users: 89,
    };
    const ctx: ToolContext = {
      apiBase: "http://test",
      fetchImpl: stubFetch({ "/api/v1/stats": stats }),
    };
    const result = await findTool("get_platform_stats")!.execute({}, ctx);
    expect(result).toEqual(stats);
  });
});
