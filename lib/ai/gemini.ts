/**
 * Gemini (Google) backend for the in-app assistant — runs on the free tier.
 *
 * Uses the classic `generateContent` REST API (the same endpoint family the
 * bottle-analysis route already uses with the free GEMINI_API_KEY) and drives
 * the shared MCP tool catalog through Gemini function calling. Each round is a
 * plain non-streaming call; the final answer is streamed to the client in one
 * chunk via `send`.
 */
import { z } from "zod";
import { geminiFunctionDeclarations, findTool } from "./tools";
import type { StreamAssistantOptions } from "./assistant";

const GEMINI_MODELS = [
  "models/gemini-2.5-flash",
  "models/gemini-2.5-flash-lite",
];

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
}

async function callGemini(
  model: string,
  apiKey: string,
  body: unknown,
): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
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

  for (let round = 0; round < opts.maxToolRounds; round++) {
    const body = {
      system_instruction: { parts: [{ text: opts.systemPrompt }] },
      contents,
      tools,
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
    };

    // Model fallback: try each model in order until one answers.
    let data: GeminiResponse | null = null;
    for (const model of GEMINI_MODELS) {
      let res: Response;
      try {
        res = await callGemini(model, apiKey, body);
      } catch {
        continue;
      }
      if (res.status === 404 || res.status === 429 || res.status === 503) {
        continue;
      }
      if (!res.ok) {
        console.error(
          `[gemini assistant] ${model} error ${res.status}:`,
          await res.text().catch(() => "unknown"),
        );
        continue;
      }
      data = (await res.json().catch(() => null)) as GeminiResponse | null;
      if (data) break;
    }

    if (!data) throw new Error("Gemini indisponibil");

    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const functionCalls = parts.filter((p) => p.functionCall);
    const text = parts
      .map((p) => p.text)
      .filter((t): t is string => typeof t === "string")
      .join("");

    if (text) opts.send(text);

    if (functionCalls.length === 0) return;

    // Echo the model turn (with its functionCall parts) back into the history.
    contents.push({ role: "model", parts });

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

  // Ran out of tool rounds without a final answer.
  opts.send(
    "Nu am putut finaliza răspunsul. Încearcă să reformulezi întrebarea.",
  );
}
