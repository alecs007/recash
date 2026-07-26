/**
 * Provider-agnostic layer for the in-app AI assistant.
 *
 * The same read-only MCP tool catalog (`lib/ai/tools.ts`) is driven by two
 * interchangeable backends:
 *   • Claude (Anthropic) — richer, paid; used when explicitly selected.
 *   • Gemini (Google) — runs on the free tier; the default for production.
 *
 * The route stays identical regardless of provider: same system prompt, same
 * tool loop, same rate limits. Only the model call differs, which lives in
 * `lib/ai/claude.ts` and `lib/ai/gemini.ts`.
 */
import type { ToolContext } from "./tools";

export type AssistantProvider = "claude" | "gemini";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamAssistantOptions {
  messages: AssistantMessage[];
  systemPrompt: string;
  ctx: ToolContext;
  /** Called with each chunk of assistant text as it becomes available. */
  send: (text: string) => void;
  /** Cap on model round-trips per user message (each round is one API call). */
  maxToolRounds: number;
}

export const MAX_TOOL_ROUNDS = 4;

export const SYSTEM_PROMPT = `Ești asistentul AI al Recash, un marketplace peer-to-peer care conectează oameni care vor să recicleze sticle SGR cu colectori din zona lor.

Contextul SGR: în România, fiecare recipient SGR are o garanție fixă de 0,5 RON. Pe Recash, posterul care deține sticlele oferă un procent din această garanție colectorului care vine să le ridice; restul rămâne posterului. Platforma nu percepe niciun comision.

Ai la dispoziție unelte read-only pentru a interoga datele reale ale platformei (anunțuri active, detalii anunț, clasament, reputația unui utilizator, estimarea câștigurilor, statistici globale). Folosește uneltele ori de câte ori întrebarea depinde de date curente — nu inventa anunțuri, prețuri sau utilizatori. Pentru întrebări despre un oraș (ex. „câte anunțuri în București"), folosește search_listings cu coordonatele aproximative ale orașului și o rază potrivită (radiusKm ~15–25 km) — nu cere utilizatorului coordonate, le știi tu (ex. București ≈ 44.43, 26.10). Folosește parametrul locationQuery doar când utilizatorul numește un cartier sau o zonă anume. Adresele exacte nu sunt niciodată expuse public; coordonatele returnate sunt aproximate intenționat (~150–350 m), așa că distanțele sunt aproximative.

Răspunde concis, în limba română, prietenos și la obiect. Când listezi anunțuri, menționează numărul de sticle, procentul oferit colectorului și localitatea. Dacă nu ai suficiente date, spune sincer.`;

export interface AssistantLimits {
  /** Per-subject sliding-window burst guard (requests / minute). */
  burstPerMin: number;
  /** Per-subject cap (requests / hour). */
  userPerHour: number;
  /** Global cap across ALL users (requests / minute). */
  globalPerMin: number;
  /** Global cap across ALL users (requests / day). */
  globalPerDay: number;
}

/**
 * Rate limits per provider. Gemini runs on a free tier, so it gets room for
 * real conversations while still blocking abuse; Claude is paid, so it keeps
 * the tight launch budget that protects spend.
 */
export function getAssistantLimits(provider: AssistantProvider): AssistantLimits {
  if (provider === "gemini") {
    return {
      burstPerMin: 8,
      userPerHour: 40,
      globalPerMin: 9,
      globalPerDay: 300,
    };
  }
  return {
    burstPerMin: 5,
    userPerHour: 8,
    globalPerMin: 5,
    globalPerDay: 150,
  };
}

/**
 * Which backend serves the assistant. `ASSISTANT_PROVIDER` wins when set;
 * otherwise we default to the free provider (Gemini) whenever its key is
 * present, falling back to Claude.
 */
export function resolveProvider(): AssistantProvider {
  const explicit = process.env.ASSISTANT_PROVIDER?.toLowerCase();
  if (explicit === "claude" || explicit === "gemini") return explicit;
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "claude";
}

/** Whether the selected provider has the API key it needs to run. */
export function isProviderConfigured(provider: AssistantProvider): boolean {
  return provider === "gemini"
    ? Boolean(process.env.GEMINI_API_KEY)
    : Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Dispatch a streaming assistant turn to the selected provider. */
export async function streamAssistant(
  provider: AssistantProvider,
  opts: StreamAssistantOptions,
): Promise<void> {
  if (provider === "gemini") {
    const { streamGeminiAssistant } = await import("./gemini");
    return streamGeminiAssistant(opts);
  }
  const { streamClaudeAssistant } = await import("./claude");
  return streamClaudeAssistant(opts);
}
