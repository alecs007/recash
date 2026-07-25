/**
 * Recash MCP server — exposes the Recash marketplace to any Model Context
 * Protocol client (Claude Desktop, IDE agents, etc.) over stdio.
 *
 * This is a standalone process (like `ws-server/`) that talks to the public
 * Recash REST API. It reuses the single read-only tool catalog in
 * `lib/ai/tools.ts` — the same catalog the in-app assistant uses — so there is
 * one service layer behind three clients: the web UI, this MCP server, and the
 * in-app assistant.
 */
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { recashTools, type ToolContext } from "../lib/ai/tools";

const API_BASE = process.env.RECASH_API_BASE ?? "http://localhost:3000";

const ctx: ToolContext = { apiBase: API_BASE };

const server = new McpServer({ name: "recash", version: "1.0.0" });

for (const tool of recashTools) {
  server.registerTool(
    tool.name,
    {
      description: tool.description,
      inputSchema: tool.inputShape,
    },
    async (args: unknown) => {
      try {
        const result = await tool.execute(
          args as Parameters<typeof tool.execute>[0],
          ctx,
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Error running ${tool.name}: ${(err as Error).message}`,
            },
          ],
        };
      }
    },
  );
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is the JSON-RPC channel — logs MUST go to stderr only.
  console.error(
    `[recash-mcp] connected over stdio — Recash API: ${API_BASE} — ` +
      `${recashTools.length} tools registered`,
  );
}

main().catch((err) => {
  console.error("[recash-mcp] fatal:", err);
  process.exit(1);
});
