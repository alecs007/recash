/**
 * Recash AI tool catalog — a single, transport-agnostic definition of the
 * read-only capabilities Recash exposes to AI assistants.
 *
 * This module is the "service layer" behind two AI transports:
 *   • the standalone MCP server (`mcp-server/`), consumed by Claude Desktop and
 *     any other Model Context Protocol client;
 *   • the in-app assistant API route (`app/api/v1/assistant`), which drives an
 *     Anthropic tool-use loop.
 *
 * Both transports call the SAME public Recash REST API (`/api/v1/...`) over
 * HTTP, so business logic stays in one place (the API) and is reused rather
 * than duplicated — a service-oriented architecture (SOA) with three clients:
 * the web UI, the MCP server, and the in-app assistant.
 *
 * The module is intentionally dependency-light: it imports only `zod` and uses
 * the global `fetch`, with no Prisma / Next.js / server-only imports. That is
 * what lets the separate `mcp-server/` package import it directly.
 */
import { z, type ZodRawShape } from "zod";

// ─── Pure domain helpers (kept in sync with lib/earnings.ts & lib/radar.ts) ───
// Reimplemented here (not imported) so this catalog stays free of any server
// dependency and can be consumed from the standalone MCP process.

/** SGR guarantee returned per recyclable container, in RON. */
export const SGR_VALUE_PER_BOTTLE = 0.5;

/** Round to the nearest 0.5 RON (real-world coin granularity). */
function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export interface EarningsBreakdown {
  bottleCount: number;
  sgrValuePerBottle: number;
  actualValue: number;
  collectorSharePercent: number;
  collectorEarning: number;
  posterEarning: number;
  currency: "RON";
}

export function estimateEarnings(
  bottleCount: number,
  collectorSharePercent: number,
): EarningsBreakdown {
  const actualValue = bottleCount * SGR_VALUE_PER_BOTTLE;
  const collectorEarning = roundToHalf(
    (actualValue * collectorSharePercent) / 100,
  );
  return {
    bottleCount,
    sgrValuePerBottle: SGR_VALUE_PER_BOTTLE,
    actualValue,
    collectorSharePercent,
    collectorEarning,
    posterEarning: actualValue - collectorEarning,
    currency: "RON",
  };
}

/** Haversine distance in km between two lat/lng points. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Tool infrastructure ──────────────────────────────────────────────────────

export interface ToolContext {
  /** Base URL of the Recash REST API, e.g. "http://localhost:3000". */
  apiBase: string;
  /** Injectable fetch (defaults to global fetch) — makes tools unit-testable. */
  fetchImpl?: typeof fetch;
}

export interface RecashTool<Shape extends ZodRawShape = ZodRawShape> {
  name: string;
  description: string;
  /** Zod raw shape — consumed directly by the MCP SDK's `registerTool`. */
  inputShape: Shape;
  /** Runs the tool and returns a JSON-serialisable result. */
  execute: (
    args: z.infer<z.ZodObject<Shape>>,
    ctx: ToolContext,
  ) => Promise<unknown>;
}

const OBJECT_ID = /^[a-f0-9]{24}$/i;

async function apiGet<T = unknown>(ctx: ToolContext, path: string): Promise<T> {
  const doFetch = ctx.fetchImpl ?? fetch;
  const res = await doFetch(`${ctx.apiBase}${path}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Recash API responded ${res.status} for ${path}`);
  }
  return (await res.json()) as T;
}

function clampInt(value: number | undefined, fallback: number, max: number) {
  if (value === undefined || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(1, Math.trunc(value)));
}

// ─── Tools ────────────────────────────────────────────────────────────────────

const searchListings: RecashTool<{
  latitude: z.ZodOptional<z.ZodNumber>;
  longitude: z.ZodOptional<z.ZodNumber>;
  radiusKm: z.ZodOptional<z.ZodNumber>;
  minBottles: z.ZodOptional<z.ZodNumber>;
  limit: z.ZodOptional<z.ZodNumber>;
}> = {
  name: "search_listings",
  description:
    "Search active Recash bottle-recycling listings (status OPEN or CLAIMED). " +
    "Optionally provide a latitude/longitude to rank results by proximity and " +
    "a radiusKm to keep only nearby listings. Note: exact addresses are never " +
    "exposed publicly — coordinates are approximated to a ~150–350 m area for " +
    "privacy, so distances are approximate. Use for questions like 'find " +
    "listings near me' or 'where can I collect bottles in Cluj'.",
  inputShape: {
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radiusKm: z.number().min(0.1).max(500).optional(),
    minBottles: z.number().min(0).optional(),
    limit: z.number().min(1).max(200).optional(),
  },
  async execute(args, ctx) {
    const limit = clampInt(args.limit, 50, 200);
    const data = await apiGet<{ posts: RawListing[] }>(
      ctx,
      `/api/v1/posts?limit=200`,
    );

    const hasOrigin =
      typeof args.latitude === "number" && typeof args.longitude === "number";

    let listings = data.posts.map((p) => {
      const distanceKm = hasOrigin
        ? Math.round(
            haversineKm(args.latitude!, args.longitude!, p.latitude, p.longitude) *
              100,
          ) / 100
        : null;
      return {
        id: p.id,
        status: p.status,
        bottleCount: p.bottleCount,
        estimatedValue: p.estimatedValue,
        collectorSharePercent: p.collectorSharePercent,
        locationName: p.locationName,
        approxLatitude: p.latitude,
        approxLongitude: p.longitude,
        distanceKm,
        pendingRequestCount: p.pendingRequestCount,
        author: p.author
          ? {
              name: p.author.name,
              reputationScore: p.author.reputationScore,
              ratingCount: p.author.ratingCount,
            }
          : null,
        createdAt: p.createdAt,
      };
    });

    if (typeof args.minBottles === "number") {
      listings = listings.filter((l) => l.bottleCount >= args.minBottles!);
    }
    if (hasOrigin && typeof args.radiusKm === "number") {
      listings = listings.filter(
        (l) => l.distanceKm !== null && l.distanceKm <= args.radiusKm!,
      );
    }
    if (hasOrigin) {
      listings.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }

    listings = listings.slice(0, limit);
    return { count: listings.length, listings };
  },
};

const getListing: RecashTool<{ id: z.ZodString }> = {
  name: "get_listing",
  description:
    "Get the public details of a single Recash listing by its id. Returns the " +
    "bottle count, estimated value, collector share percentage, status, " +
    "approximate location and the author's public reputation. Exact address " +
    "and phone numbers are never returned to unauthenticated clients.",
  inputShape: {
    id: z.string().regex(OBJECT_ID, "Must be a 24-character hex id"),
  },
  async execute(args, ctx) {
    const p = await apiGet<RawListingDetail>(ctx, `/api/v1/posts/${args.id}`);
    return {
      id: p.id,
      status: p.status,
      description: p.description,
      bottleCount: p.bottleCount,
      estimatedValue: p.estimatedValue,
      collectorSharePercent: p.collectorSharePercent,
      locationName: p.locationName,
      approxLatitude: p.latitude,
      approxLongitude: p.longitude,
      pendingRequestCount: p.pendingRequestCount,
      author: p.author
        ? {
            id: p.author.id,
            name: p.author.name,
            reputationScore: p.author.reputationScore,
            ratingCount: p.author.ratingCount,
          }
        : null,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
    };
  },
};

const getLeaderboard: RecashTool<{
  page: z.ZodOptional<z.ZodNumber>;
  limit: z.ZodOptional<z.ZodNumber>;
}> = {
  name: "get_leaderboard",
  description:
    "Get the Recash leaderboard — the top users ranked by total bottles " +
    "recycled (given + collected). Supports pagination. Use for 'who's on the " +
    "leaderboard' or 'top recyclers' questions.",
  inputShape: {
    page: z.number().min(1).optional(),
    limit: z.number().min(1).max(50).optional(),
  },
  async execute(args, ctx) {
    const page = clampInt(args.page, 1, 10_000);
    const limit = clampInt(args.limit, 10, 50);
    return apiGet(ctx, `/api/v1/leaderboard?page=${page}&limit=${limit}`);
  },
};

const getUserReputation: RecashTool<{ id: z.ZodString }> = {
  name: "get_user_reputation",
  description:
    "Get a Recash user's public reputation profile by id: their rating score, " +
    "number of ratings, bottles given/collected, transaction count, badge " +
    "count and a few recent reviews. Use to check who you'd be dealing with.",
  inputShape: {
    id: z.string().regex(OBJECT_ID, "Must be a 24-character hex id"),
  },
  async execute(args, ctx) {
    const data = await apiGet<RawUserProfile>(
      ctx,
      `/api/v1/users/${args.id}`,
    );
    const u = data.user;
    return {
      user: {
        id: u.id,
        name: u.name,
        certified: u.certified,
        reputationScore: u.reputationScore,
        ratingCount: u.ratingCount,
        totalBottlesGiven: u.totalBottlesGiven,
        totalBottlesCollected: u.totalBottlesCollected,
        totalTransactions: u.totalTransactions,
        memberSince: u.createdAt,
      },
      badgeCount: data.badges?.length ?? 0,
      recentReviews: (data.reviews ?? []).slice(0, 5).map((r) => ({
        rating: r.rating,
        review: r.review,
        role: r.role,
        reviewerName: r.reviewer?.name ?? null,
      })),
    };
  },
};

const estimateEarningsTool: RecashTool<{
  bottleCount: z.ZodNumber;
  collectorSharePercent: z.ZodNumber;
}> = {
  name: "estimate_earnings",
  description:
    "Estimate how a Recash exchange splits the SGR guarantee (0.5 RON per " +
    "container) between the poster and the collector, given a bottle count and " +
    "the percentage offered to the collector. Pure calculation — no network " +
    "access. Use to answer 'how much would X bottles at Y% be worth'.",
  inputShape: {
    bottleCount: z.number().int().min(1).max(100_000),
    collectorSharePercent: z.number().min(0).max(100),
  },
  async execute(args) {
    return estimateEarnings(args.bottleCount, args.collectorSharePercent);
  },
};

const getPlatformStats: RecashTool<Record<string, never>> = {
  name: "get_platform_stats",
  description:
    "Get aggregate Recash platform statistics: total bottles recycled, " +
    "completed exchanges, active listings and registered users. Use for " +
    "'how many bottles has Recash helped recycle' type questions.",
  inputShape: {},
  async execute(_args, ctx) {
    return apiGet(ctx, `/api/v1/stats`);
  },
};

/** The full read-only Recash tool catalog. */
export const recashTools = [
  searchListings,
  getListing,
  getLeaderboard,
  getUserReputation,
  estimateEarningsTool,
  getPlatformStats,
] as unknown as RecashTool[];

// ─── Anthropic tool-use adapter ───────────────────────────────────────────────

export interface AnthropicToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/** Convert a tool's zod shape into an Anthropic-compatible JSON Schema. */
export function toAnthropicSchema(tool: RecashTool): Record<string, unknown> {
  const schema = z.toJSONSchema(z.object(tool.inputShape)) as Record<
    string,
    unknown
  >;
  // Anthropic ignores $schema but drop it for a clean input_schema.
  delete schema.$schema;
  return schema;
}

/** Anthropic `tools` array built from the catalog. */
export function anthropicToolDefinitions(): AnthropicToolDefinition[] {
  return recashTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: toAnthropicSchema(tool),
  }));
}

/** Look up a tool by name (used by the assistant's tool-use loop). */
export function findTool(name: string): RecashTool | undefined {
  return recashTools.find((t) => t.name === name);
}

// ─── Minimal shapes for the REST payloads we consume ──────────────────────────

interface RawAuthor {
  id?: string;
  name: string | null;
  image?: string | null;
  reputationScore: number;
  ratingCount: number;
}

interface RawListing {
  id: string;
  status: string;
  bottleCount: number;
  estimatedValue: number;
  collectorSharePercent: number;
  latitude: number;
  longitude: number;
  locationName: string | null;
  pendingRequestCount: number;
  author: RawAuthor | null;
  createdAt: string;
}

interface RawListingDetail extends RawListing {
  description: string;
  expiresAt: string | null;
}

interface RawUserProfile {
  user: {
    id: string;
    name: string | null;
    certified: boolean;
    reputationScore: number;
    ratingCount: number;
    totalBottlesGiven: number;
    totalBottlesCollected: number;
    totalTransactions: number;
    createdAt: string;
  };
  badges?: unknown[];
  reviews?: {
    rating: number;
    review: string | null;
    role: string;
    reviewer?: { name: string | null } | null;
  }[];
}
