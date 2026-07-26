/**
 * Claude (Anthropic) backend for the in-app assistant. Streams tokens and runs
 * the Anthropic tool-use loop against the shared MCP tool catalog.
 *
 * Model note: Haiku 4.5 is the cheapest Claude model and does NOT support
 * adaptive thinking or the `effort` parameter (both 400 on Haiku), so the
 * stream call omits them.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropicToolDefinitions, findTool } from "./tools";
import type { StreamAssistantOptions } from "./assistant";

const MODEL = "claude-haiku-4-5";

export async function streamClaudeAssistant(
  opts: StreamAssistantOptions,
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");

  const anthropic = new Anthropic({ apiKey });
  // The catalog stays SDK-agnostic (plain JSON Schema); cast to the SDK's Tool
  // shape at the boundary.
  const tools = anthropicToolDefinitions() as unknown as Anthropic.Tool[];

  const messages: Anthropic.MessageParam[] = opts.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let round = 0; round < opts.maxToolRounds; round++) {
    const turn = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 2048,
      system: opts.systemPrompt,
      tools,
      messages,
    });

    for await (const event of turn) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        opts.send(event.delta.text);
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
        const result = await tool.execute(args, opts.ctx);
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
}
