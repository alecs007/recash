import { z } from "zod";

const SENSITIVE_PATTERN =
  /(\b[\w.-]+@[\w.-]+\.\w{2,}\b)|((https?:\/\/|www\.)\S+)|(\b(\+4|0)[\d\s\-().]{8,}\b)/i;

export const BOTTLE_PRESETS = [
  {
    value: 5,
    label: "~5 sticle",
    image: "/images/bottles/5-count.svg",
    desc: "Un sac mic",
  },
  {
    value: 10,
    label: "~10 sticle",
    image: "/images/bottles/10-count.svg",
    desc: "Un sac mediu",
  },
  {
    value: 25,
    label: "~25 sticle",
    image: "/images/bottles/25-count.svg",
    desc: "Două-trei sacoșe",
  },
  {
    value: 50,
    label: "~50 sticle",
    image: "/images/bottles/50-count.svg",
    desc: "Un tomberon mic",
  },
  {
    value: 100,
    label: "~100 sticle",
    image: "/images/bottles/100-count.svg",
    desc: "Un tomberon mare",
  },
  {
    value: 200,
    label: "~200 sticle",
    image: "/images/bottles/200-count.svg",
    desc: "Mai multe tomberoane",
  },
  { value: 0, label: "Altul", image: null, desc: "Introduc eu numărul" },
] as const;

export const RON_PER_BOTTLE = 0.5;

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
    .refine(
      (v) => !SENSITIVE_PATTERN.test(v),
      "Descrierea nu poate conține numere de telefon, adrese de email sau linkuri.",
    )
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

  expiresInHours: z.number().int().min(1).max(8760).nullable().default(168),
  availabilitySchedule: z
    .array(
      z.object({
        day: z.number().int().min(0).max(6),
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/),
      }),
    )
    .max(7)
    .nullable()
    .optional()
    .default(null),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

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

export const approveClaimSchema = z.object({
  action: z.enum(["approve", "deny"]),
  collectorId: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID colector invalid"),
});
