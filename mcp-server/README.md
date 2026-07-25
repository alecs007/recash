# Recash MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes the
Recash marketplace to AI assistants (Claude Desktop, IDE agents, or any MCP client).

It is a standalone process that talks to the public Recash
REST API and reuses the **same read-only tool catalog** as the in-app assistant. One service layer, three clients:
the web UI, this MCP server, and the in-app assistant.

## Tools

| Tool                  | What it does                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| `search_listings`     | Active listings, optionally ranked by proximity to a lat/lng and filtered by radius / min bottles |
| `get_listing`         | Public details of one listing by id                                                               |
| `get_leaderboard`     | Top recyclers, paginated                                                                          |
| `get_user_reputation` | A user's public rating, badges and recent reviews                                                 |
| `estimate_earnings`   | Split the SGR guarantee between poster and collector for a bottle count + share % (pure calc)     |
| `get_platform_stats`  | Aggregate totals: bottles recycled, exchanges, active listings, users                             |

All tools are **read-only**. Exact addresses and phone numbers are never exposed —
coordinates are approximated to a ~150–350 m area by the API, exactly as they are
for anonymous web visitors.

## Run it

The server speaks JSON-RPC over **stdio**, so it is launched by the MCP client, not
run as a network daemon. For local development, from the repo root:

```bash
# Recash must be running (pnpm dev) so the API is reachable.
RECASH_API_BASE=http://localhost:3000 pnpm mcp
```

`RECASH_API_BASE` defaults to `http://localhost:3000`; point it at a deployed
instance (e.g. `https://recash.ro`) to query production data.

## Connect from Claude Desktop

Add an entry to `claude_desktop_config.json`
(macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`,
Windows: `%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "recash": {
      "command": "npx",
      "args": ["-y", "tsx", "C:/Users/you/…/recash/mcp-server/server.ts"],
      "env": {
        "RECASH_API_BASE": "http://localhost:3000"
      }
    }
  }
}
```

Restart Claude Desktop, then ask things like:

- "Find bottle listings near latitude 46.77, longitude 23.62 within 10 km."
- "Show me the Recash leaderboard."
- "How much would 240 bottles at a 60% collector share be worth?"
- "How many bottles has Recash helped recycle so far?"

## Inspect it

You can also poke the server with the official inspector:

```bash
pnpm @modelcontextprotocol/inspector pnpm tsx mcp-server/server.ts
```
