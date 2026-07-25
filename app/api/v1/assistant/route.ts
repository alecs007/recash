import { auth } from "@/auth";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  anthropicToolDefinitions,
  findTool,
  type ToolContext,
} from "@/lib/ai/tools";

// Chat is inherently more expensive than a normal read, so it gets its own
// tighter budget than RL.read/RL.public.
const ASSISTANT_RL = { limit: 15, windowSec: 60 };

const MODEL = "claude-opus-4-8";
const MAX_TOOL_ROUNDS = 6;

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

const SYSTEM_PROMPT = `Ești asistentul AI al Recash, un marketplace peer-to-peer care conectează oameni care vor să recicleze sticle SGR cu colectori din zona lor.

Contextul SGR: în România, fiecare recipient SGR are o garanție fixă de 0,5 RON. Pe Recash, posterul care deține sticlele oferă un procent din această garanție colectorului care vine să le ridice; restul rămâne posterului. Platforma nu percepe niciun comision.

Ai la dispoziție unelte read-only pentru a interoga datele reale ale platformei (anunțuri active, detalii anunț, clasament, reputația unui utilizator, estimarea câștigurilor, statistici globale). Folosește uneltele ori de câte ori întrebarea depinde de date curente — nu inventa anunțuri, prețuri sau utilizatori. Adresele exacte nu sunt niciodată expuse public; coordonatele returnate sunt aproximate intenționat (~150–350 m), așa că distanțele sunt aproximative.

Răspunde concis, în limba română, prietenos și la obiect. Când listezi anunțuri, menționează numărul de sticle, procentul oferit colectorului și localitatea. Dacă nu ai suficiente date, spune sincer.`;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const session = await auth();
  const rl = await rateLimit(
    session?.user?.id
      ? `assistant:${session.user.id}`
      : `assistant:ip:${getClientIp(req)}`,
    ASSISTANT_RL,
  );
  if (!rl.ok) return rl.response;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError(
      "Asistentul AI nu este configurat (lipsește ANTHROPIC_API_KEY).",
      503,
    );
  }

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

  const anthropic = new Anthropic({ apiKey });
  const ctx: ToolContext = {
    apiBase: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };
  // The catalog stays SDK-agnostic (plain JSON Schema); cast to the SDK's Tool
  // shape at the boundary.
  const tools = anthropicToolDefinitions() as unknown as Anthropic.Tool[];

  const messages: Anthropic.MessageParam[] = parsed.data.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));
      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const turn = anthropic.messages.stream({
            model: MODEL,
            max_tokens: 2048,
            thinking: { type: "adaptive" },
            output_config: { effort: "low" },
            system: SYSTEM_PROMPT,
            tools,
            messages,
          });

          for await (const event of turn) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              send(event.delta.text);
            }
          }

          const final = await turn.finalMessage();
          messages.push({ role: "assistant", content: final.content });

          if (final.stop_reason !== "tool_use") break;

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of final.content) {
            if (block.type !== "tool_use") continue;
            const tool = findTool(block.name);
            if (!tool) {
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                is_error: true,
                content: `Unknown tool: ${block.name}`,
              });
              continue;
            }
            try {
              const args = z.object(tool.inputShape).parse(block.input ?? {});
              const result = await tool.execute(args, ctx);
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: JSON.stringify(result),
              });
            } catch (err) {
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                is_error: true,
                content: `Tool error: ${(err as Error).message}`,
              });
            }
          }
          messages.push({ role: "user", content: toolResults });
        }
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
