import { auth } from "@/auth";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { redis } from "@/lib/redis";
import type { ToolContext } from "@/lib/ai/tools";
import {
  MAX_TOOL_ROUNDS,
  SYSTEM_PROMPT,
  getAssistantLimits,
  isProviderConfigured,
  resolveProvider,
  streamAssistant,
} from "@/lib/ai/assistant";

// The assistant can fan out into several model round-trips per message, so it
// is by far the most expensive endpoint. Actual limit VALUES are per-provider
// (see getAssistantLimits) — generous for free Gemini, tight for paid Claude.
// A "subject" is the logged-in user, or the IP for anonymous visitors.
const USER_WINDOW_SECONDS = 60 * 60;
const DAY_SECONDS = 60 * 60 * 24;
const GLOBAL_RPM_KEY = "ai:assistant:global:rpm";
const GLOBAL_DAILY_KEY = "ai:assistant:global:daily";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
});

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

// 429 with a machine-readable `code` so the UI can tell the user whether the
// assistant is globally overloaded or it's their own limit.
function rateLimited(code: string, message: string) {
  return Response.json({ error: message, code }, { status: 429 });
}

// Window counters via a single Redis INCR (+ EXPIRE on first hit). They
// fail open on Redis errors so an outage never blocks the assistant entirely.
async function checkGlobalRpm(limit: number): Promise<boolean> {
  try {
    const count = await redis.incr(GLOBAL_RPM_KEY);
    if (count === 1) await redis.expire(GLOBAL_RPM_KEY, 60);
    return count <= limit;
  } catch {
    return true;
  }
}

async function checkGlobalDaily(limit: number): Promise<boolean> {
  try {
    const count = await redis.incr(GLOBAL_DAILY_KEY);
    if (count === 1) await redis.expire(GLOBAL_DAILY_KEY, DAY_SECONDS);
    return count <= limit;
  } catch {
    return true;
  }
}

async function checkUserHourly(
  subject: string,
  limit: number,
): Promise<boolean> {
  const key = `ai:assistant:sub:${subject}:hourly`;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, USER_WINDOW_SECONDS);
    return count <= limit;
  } catch {
    return true;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const subject = session?.user?.id
    ? `user:${session.user.id}`
    : `ip:${getClientIp(req)}`;

  // 1. Pick the backend (Gemini free-tier by default, Claude when selected)
  //    and its limit set.
  const provider = resolveProvider();
  if (!isProviderConfigured(provider)) {
    return jsonError(
      provider === "gemini"
        ? "Asistentul AI nu este configurat (lipsește GEMINI_API_KEY)."
        : "Asistentul AI nu este configurat (lipsește ANTHROPIC_API_KEY).",
      503,
    );
  }
  const limits = getAssistantLimits(provider);

  // 2. Per-subject burst guard — cheap, stops a single client hammering us.
  const rl = await rateLimit(`assistant:${subject}`, {
    limit: limits.burstPerMin,
    windowSec: 60,
  });
  if (!rl.ok) {
    return rateLimited(
      "too_fast",
      "Trimiți mesaje prea repede. Așteaptă câteva secunde și încearcă din nou.",
    );
  }

  // 3. Validate the request BEFORE spending any global budget.
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("Cerere invalidă", 400);
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError("Date invalide", 400);
  }

  // 4. Global caps first (the shared ceiling), then the per-subject hourly cap.
  // Short-circuit so the daily counter is not touched once RPM is hit. Distinct
  // codes let the UI say "everyone" vs "just you".
  if (
    !(await checkGlobalRpm(limits.globalPerMin)) ||
    !(await checkGlobalDaily(limits.globalPerDay))
  ) {
    return rateLimited(
      "overloaded",
      "Asistentul este suprasolicitat momentan (prea multe cereri în total). Încearcă din nou în câteva minute.",
    );
  }
  if (!(await checkUserHourly(subject, limits.userPerHour))) {
    return rateLimited(
      "user_limit",
      "Ai atins limita ta de mesaje pentru moment. Încearcă din nou mai târziu.",
    );
  }

  const ctx: ToolContext = {
    apiBase: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));
      try {
        await streamAssistant(provider, {
          messages: parsed.data.messages,
          systemPrompt: SYSTEM_PROMPT,
          ctx,
          send,
          maxToolRounds: MAX_TOOL_ROUNDS,
        });
      } catch (err) {
        console.error("[POST /api/v1/assistant]", err);
        send("\n\n⚠️ A apărut o eroare la generarea răspunsului.");
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
