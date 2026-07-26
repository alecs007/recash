/**
 * Gemini (Google) backend for the in-app assistant — runs on the free tier.
 *
 * Uses the classic `streamGenerateContent` REST API (SSE) so text reaches the
 * client progressively, and drives the shared MCP tool catalog through Gemini
 * function calling. Falls back across models on connection errors and never
 * finishes with an empty bubble.
 */
import { z } from "zod";
import { geminiFunctionDeclarations, findTool } from "./tools";
import type { StreamAssistantOptions } from "./assistant";

// Gemini models in priority order — same free-tier set as analyze-bottles.
const GEMINI_MODELS = ["models/gemini-2.5-flash", "models/gemini-2.5-flash-lite"];

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiChunk {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
}

const EMPTY_REPLY =
  "Momentan nu am putut genera un răspuns. Încearcă să reformulezi întrebarea.";

/**
 * Open an SSE stream, trying each model until one connects. Returns "quota"
 * when every model was rate-limited (429) — a free-tier limit, not a real
 * outage — so the caller can show a friendly message instead of a hard error.
 */
async function openStream(
  apiKey: string,
  body: unknown,
): Promise<Response | "quota" | null> {
  let sawQuota = false;
  for (const model of GEMINI_MODELS) {
    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
    } catch {
      continue;
    }
    if (res.status === 429) {
      sawQuota = true;
      continue;
    }
    if (res.status === 404 || res.status === 503) continue;
    if (!res.ok || !res.body) {
      console.error(
        `[gemini assistant] ${model} error ${res.status}:`,
        res.ok ? "no body" : await res.text().catch(() => "unknown"),
      );
      continue;
    }
    return res;
  }
  return sawQuota ? "quota" : null;
}

export async function streamGeminiAssistant(
  opts: StreamAssistantOptions,
): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const tools = [{ function_declarations: geminiFunctionDeclarations() }];

  const contents: GeminiContent[] = opts.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let sentAny = false;
  const send = (text: string) => {
    if (text) {
      sentAny = true;
      opts.send(text);
    }
  };

  for (let round = 0; round < opts.maxToolRounds; round++) {
    const body = {
      system_instruction: { parts: [{ text: opts.systemPrompt }] },
      contents,
      tools,
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
    };

    const res = await openStream(apiKey, body);
    if (res === "quota") {
      opts.send(
        sentAny
          ? "\n\n(Serviciul AI a atins limita de trafic gratuit — încearcă din nou în câteva momente.)"
          : "Serviciul AI este temporar suprasolicitat (limita de trafic gratuit). Încearcă din nou în câteva momente.",
      );
      return;
    }
    if (!res) throw new Error("Gemini indisponibil");

    // Consume the SSE stream: text parts are streamed to the client as they
    // arrive; functionCall parts are collected for this round.
    const functionCalls: GeminiPart[] = [];
    let roundText = "";
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const handleChunk = (chunk: GeminiChunk) => {
      const parts = chunk.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (typeof part.text === "string" && part.text) {
          roundText += part.text;
          send(part.text);
        } else if (part.functionCall) {
          functionCalls.push(part);
        }
      }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          handleChunk(JSON.parse(payload) as GeminiChunk);
        } catch {
          // ignore malformed SSE lines
        }
      }
    }

    if (functionCalls.length === 0) {
      // Terminal turn. If the model produced nothing, don't leave an empty
      // bubble — send a graceful fallback.
      if (!sentAny) opts.send(EMPTY_REPLY);
      return;
    }

    // Echo the model turn (streamed text + its functionCall parts) into history.
    const modelParts: GeminiPart[] = [];
    if (roundText) modelParts.push({ text: roundText });
    modelParts.push(...functionCalls);
    contents.push({ role: "model", parts: modelParts });

    // Execute each tool and reply with functionResponse parts (role "user").
    const responseParts: GeminiPart[] = [];
    for (const p of functionCalls) {
      const call = p.functionCall!;
      const tool = findTool(call.name);
      if (!tool) {
        responseParts.push({
          functionResponse: {
            name: call.name,
            response: { error: `Unknown tool: ${call.name}` },
          },
        });
        continue;
      }
      try {
        const args = z.object(tool.inputShape).parse(call.args ?? {});
        const result = await tool.execute(args, opts.ctx);
        responseParts.push({
          functionResponse: { name: call.name, response: { result } },
        });
      } catch (err) {
        responseParts.push({
          functionResponse: {
            name: call.name,
            response: { error: (err as Error).message },
          },
        });
      }
    }
    contents.push({ role: "user", parts: responseParts });
  }

  // Ran out of tool rounds. Only add a note if we never produced any answer.
  if (!sentAny) {
    opts.send("Nu am putut finaliza răspunsul. Încearcă să reformulezi întrebarea.");
  }
}
