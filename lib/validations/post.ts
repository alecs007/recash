import { z } from "zod";

// ─── Bottle count presets ────────────────────────────────────────────────────

export const BOTTLE_PRESETS = [
  {
    value: 5,
    label: "~5 sticle",
    image: "/images/bottles/count-5.svg",
    desc: "Un sac mic",
  },
  {
    value: 10,
    label: "~10 sticle",
    image: "/images/bottles/count-10.svg",
    desc: "Un sac mediu",
  },
  {
    value: 25,
    label: "~25 sticle",
    image: "/images/bottles/count-25.svg",
    desc: "Două-trei sacoșe",
  },
  {
    value: 50,
    label: "~50 sticle",
    image: "/images/bottles/count-50.svg",
    desc: "Un tomberon mic",
  },
  {
    value: 100,
    label: "~100 sticle",
    image: "/images/bottles/count-100.svg",
    desc: "Un tomberon mare",
  },
  {
    value: 200,
    label: "~200 sticle",
    image: "/images/bottles/count-200.svg",
    desc: "Mai multe tomberoane",
  },
  { value: 0, label: "Altul", image: null, desc: "Introduc eu numărul" },
] as const;

// SGR Romania: 0.50 RON per bottle
export const RON_PER_BOTTLE = 0.5;

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const createPostSchema = z.object({
  bottleCount: z
    .number({ error: "Numărul de sticle este obligatoriu" })
    .int("Numărul trebuie să fie întreg")
    .min(1, "Minim 1 sticlă")
    .max(10_000, "Maxim 10.000 sticle"),

  estimatedValue: z
    .number({ error: "Valoarea estimată este obligatorie" })
    .positive("Valoarea trebuie să fie pozitivă")
    .max(5_000, "Valoare maximă 5.000 RON"),

  collectorSharePercent: z
    .number()
    .int()
    .min(0, "Minim 0%")
    .max(100, "Maxim 100%")
    .default(30),

  description: z
    .string()
    .max(500, "Maxim 500 de caractere")
    .trim()
    .optional()
    .default(""),

  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),

  locationName: z.string().max(200).trim().optional().nullable(),
  address: z.string().max(500).trim().optional().nullable(),

  phone: z
    .string()
    .trim()
    .regex(/^[\d\s+\-()\s]*$/, "Format telefon invalid")
    .max(20, "Maxim 20 de caractere")
    .optional()
    .nullable()
    .transform((v) => v || null),

  images: z
    .array(z.string().url("URL imagine invalid"))
    .max(5, "Maxim 5 imagini")
    .optional()
    .default([]),

  expiresInHours: z.number().int().min(1).max(168).default(48),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

// ─── Review schema ────────────────────────────────────────────────────────────

export const reviewSchema = z.object({
  rating: z
    .number({ error: "Rating-ul este obligatoriu" })
    .int()
    .min(1, "Minim 1 stea")
    .max(5, "Maxim 5 stele"),

  review: z
    .string()
    .max(500, "Maxim 500 de caractere")
    .trim()
    .optional()
    .nullable(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

// ─── Claim schema ─────────────────────────────────────────────────────────────

export const approveClaimSchema = z.object({
  action: z.enum(["approve", "deny"]),
});

// ─── Cancel schema ────────────────────────────────────────────────────────────

export const cancelSchema = z.object({
  reason: z.string().max(200).trim().optional().nullable(),
});
