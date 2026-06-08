import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { redis } from "@/lib/redis";
import { rateLimit, RL } from "@/lib/rate-limit";

// Per-user daily limit
const USER_DAILY_LIMIT = 20;
const WINDOW_SECONDS = 24 * 60 * 60;

// Global RPM guard — Gemini free tier is 15 RPM, stay safely under
const GLOBAL_RPM_KEY = "ai:bottles:global:rpm";
const GLOBAL_RPM_LIMIT = 12;

// Gemini models in priority order
const GEMINI_MODELS = [
  "models/gemini-2.5-flash",
  "models/gemini-2.0-flash",
  "models/gemini-2.0-flash-001",
];

// HuggingFace fallback model
const HF_MODEL = "meta-llama/Llama-3.2-11B-Vision-Instruct";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const PROMPT = `You are an expert at estimating the number of PET bottles and aluminum cans for recycling in Romania (SGR/RetuRO system).

Analyze this image and estimate the TOTAL number of bottles/cans visible or suggested (including those partially hidden in bags, boxes, etc).

Respond STRICTLY in JSON format:
{
  "estimate": <integer>,
  "confidence": "<scăzut|mediu|ridicat>",
  "note": "<short observation in Romanian, max 60 characters>"
}

Rules:
- If there are no bottles/cans, return estimate: 0
- If it's a full bag, estimate volume and typical density (~30-50 bottles/average bag)
- If there are multiple bags, multiply accordingly
- Be conservative: estimate the realistic minimum
- ONLY JSON, no text outside the JSON`;

async function checkGlobalRpm(): Promise<boolean> {
  try {
    const count = await redis.incr(GLOBAL_RPM_KEY);
    if (count === 1) await redis.expire(GLOBAL_RPM_KEY, 60);
    return count <= GLOBAL_RPM_LIMIT;
  } catch {
    return true;
  }
}

async function checkUserDailyLimit(
  userId: string,
): Promise<{ ok: boolean; remaining: number }> {
  const key = `ai:bottles:user:${userId}:daily`;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_SECONDS);
    if (count > USER_DAILY_LIMIT) return { ok: false, remaining: 0 };
    return { ok: true, remaining: Math.max(0, USER_DAILY_LIMIT - count) };
  } catch {
    return { ok: true, remaining: USER_DAILY_LIMIT };
  }
}

async function callGemini(
  apiKey: string,
  model: string,
  imageBase64: string,
  mimeType: AllowedMimeType,
): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200,
          responseMimeType: "application/json",
        },
      }),
    },
  );
}

async function callHuggingFace(
  apiKey: string,
  imageBase64: string,
  mimeType: AllowedMimeType,
): Promise<{ estimate: number; confidence: string; note: string } | null> {
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  let response: Response;
  try {
    response = await fetch(
      `https://api-inference.huggingface.co/models/${HF_MODEL}/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: HF_MODEL,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: PROMPT },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          signal: AbortSignal.timeout(40_000),
          max_tokens: 200,
          temperature: 0.1,
        }),
      },
    );
  } catch {
    console.error("[analyze-bottles] HF network error");
    return null;
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "unknown");
    console.error(`[analyze-bottles] HF error ${response.status}:`, errText);
    return null;
  }

  const data = await response.json().catch(() => null);
  const rawText: string = data?.choices?.[0]?.message?.content ?? "";

  if (!rawText) {
    console.error("[analyze-bottles] HF empty response");
    return null;
  }

  try {
    const clean = rawText.replace(/```json|```/g, "").trim();
    // Extract JSON object if model adds surrounding text
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    console.error("[analyze-bottles] HF JSON parse failed:", rawText);
    return null;
  }
}

function parseGeminiResult(
  rawText: string,
): { estimate: number; confidence: string; note: string } | null {
  try {
    const clean = rawText.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const rl = await rateLimit(session.user.id, RL.write);
  if (!rl.ok) return rl.response;

  const globalOk = await checkGlobalRpm();
  if (!globalOk) {
    return NextResponse.json(
      {
        error: "Serviciul AI este ocupat. Încearcă din nou în câteva secunde.",
      },
      { status: 429 },
    );
  }

  const { ok: dailyOk, remaining } = await checkUserDailyLimit(session.user.id);
  if (!dailyOk) {
    return NextResponse.json(
      {
        error: `Ai atins limita zilnică de ${USER_DAILY_LIMIT} analize AI. Revino mâine!`,
      },
      { status: 429 },
    );
  }

  let body: { imageBase64?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă" }, { status: 400 });
  }

  const { imageBase64, mimeType } = body;

  if (!imageBase64 || !mimeType) {
    return NextResponse.json({ error: "Imagine lipsă" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    return NextResponse.json(
      { error: "Format imagine nesuportat (JPEG, PNG, WebP, HEIC)" },
      { status: 400 },
    );
  }

  if (imageBase64.length > 5_500_000) {
    return NextResponse.json(
      { error: "Imaginea este prea mare (max 4MB)" },
      { status: 400 },
    );
  }

  // ── 1. Try Gemini models ──────────────────────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey) {
    for (const model of GEMINI_MODELS) {
      let response: Response;
      try {
        response = await callGemini(
          geminiKey,
          model,
          imageBase64,
          mimeType as AllowedMimeType,
        );
      } catch {
        continue;
      }

      if (response.status === 404) {
        console.warn(`[analyze-bottles] Gemini model not found: ${model}`);
        continue;
      }

      if (response.status === 429 || response.status === 503) {
        console.warn(
          `[analyze-bottles] Gemini unavailable (${response.status}): ${model}`,
        );
        continue;
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => "unknown");
        console.error(
          `[analyze-bottles] Gemini ${model} error ${response.status}:`,
          errText,
        );
        continue;
      }

      const geminiData = await response.json().catch(() => null);
      const rawText: string =
        geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const parsed = parseGeminiResult(rawText);

      if (!parsed) {
        console.error(
          `[analyze-bottles] Gemini parse failed for ${model}:`,
          rawText,
        );
        continue;
      }

      return NextResponse.json({
        estimate: Math.max(
          0,
          Math.min(10_000, Math.round(Number(parsed.estimate) || 0)),
        ),
        confidence: parsed.confidence ?? "mediu",
        note: parsed.note ?? "",
        remainingToday: remaining,
      });
    }
  }

  // ── 2. Fallback: HuggingFace Llama 3.2 Vision ────────────────────────────
  const hfKey = process.env.HUGGINGFACE_API_KEY;

  if (hfKey) {
    console.info(
      "[analyze-bottles] Gemini exhausted, trying HuggingFace fallback",
    );
    const parsed = await callHuggingFace(
      hfKey,
      imageBase64,
      mimeType as AllowedMimeType,
    );

    if (parsed) {
      return NextResponse.json({
        estimate: Math.max(
          0,
          Math.min(10_000, Math.round(Number(parsed.estimate) || 0)),
        ),
        confidence: parsed.confidence ?? "scăzut",
        note: parsed.note ?? "",
        remainingToday: remaining,
      });
    }
  }

  // ── 3. Everything failed ──────────────────────────────────────────────────
  console.error("[analyze-bottles] all providers failed");
  return NextResponse.json(
    { error: "Serviciul AI nu este disponibil momentan. Încearcă mai târziu." },
    { status: 502 },
  );
}
