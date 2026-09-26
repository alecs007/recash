# ♻️ Recash

**Recash** is a peer-to-peer marketplace that connects people who want to recycle SGR bottles with **collectors** in their area, who pick them up in exchange for an agreed amount. No more waiting in line at the RVM machine — you post a listing, a collector claims it, you meet up, money and bottles change hands.

🥇 Built for 2026 National Olympiad of Innovation and Digital Creation, Web section — gold medal (second prize).

<p align="center">
  <img src="https://res.cloudinary.com/dqyq1oiwi/image/upload/v1784458028/image_3_teiwqa.png" alt="Recash homepage" width="800"/>
</p>

## 🧩 What the app does

- **Create a listing** — the user enters the number of bottles, the location, and the percentage offered to the collector (with an AI-powered quantity estimate from an image, via Gemini/HuggingFace Vision).
- **Interactive map (Leaflet + OpenStreetMap)** — collectors see active listings in their area and can filter/search.
- **Collection flow**: `OPEN → CLAIMED → IN_PROGRESS → COMPLETED` (with `CANCELLED`/`EXPIRED` as terminal states), backed by a unique confirmation code generated on collection.
- **Live chat** and **real-time notifications** via WebSocket (dedicated server, `ws-server/`).
- **Radar** — in-app + email alerts when a new listing appears within a user-defined radius.
- **Reputation, reviews, badges, and a leaderboard** to encourage fair, active use of the platform.
- **Authentication** with Google, Facebook, and Google One Tap.
- **AI integrations** — an in-app chat assistant and a standalone [MCP server](mcp-server/README.md) that expose the marketplace to AI assistants (Claude Desktop, etc.) via one shared read-only tool catalog.

<p align="center">
  <img src="https://res.cloudinary.com/dqyq1oiwi/image/upload/v1784406125/image_1_kag12u.png" alt="Recash map" width="800"/>
</p>

## 🏗️ Architecture

```
Next.js 16 (App Router, React 19)
 ├─ app/            → pages + API routes (REST, /api/v1/...)
 ├─ components/     → UI/UX (client & server components)
 ├─ hooks/          → SWR + WebSocket client hooks
 ├─ lib/            → business logic (badges, notifications, radar, email, cache, rate-limit)
 ├─ prisma/         → MongoDB schema + seed script
 ├─ ws-server/      → standalone WebSocket server (Node/ws) for real-time events
 └─ mcp-server/     → standalone Model Context Protocol server (exposes Recash to AI assistants)

AI integrations (share one read-only tool catalog, lib/ai/tools.ts):
 ├─ mcp-server/            → MCP server for Claude Desktop / any MCP client (stdio)
 └─ app/api/v1/assistant/  → in-app chat assistant (Anthropic SDK tool-use loop)

Persistence & infra:
 ├─ MongoDB (via Prisma)   → persistent data (users, listings, transactions, badges, ...)
 ├─ Redis (ioredis)        → caching, rate-limiting, WebSocket pub/sub, WS session tokens
 └─ Resend                 → transactional email delivery
```

The frontend talks to the Next.js API (REST), while live updates (chat, listing status, notifications) flow through `ws-server`, using Redis pub/sub as the broker between instances.

## ⚙️ Requirements

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://www.pnpm.io/) (or another compatible package manager)
- [MongoDB](https://www.mongodb.com/) (local or cloud) — Prisma uses the `mongodb` provider
- [Redis](https://redis.io/) (local or e.g. Upstash/Redis Cloud)
- (Optional, recommended) [Docker](https://www.docker.com/) to quickly spin up MongoDB + Redis locally

## 🚀 Local installation & setup

### 1. Clone the repo

```bash
git clone https://github.com/alecs007/recash.git
cd recash
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Start MongoDB and Redis (via Docker, easiest way)

```bash
docker run -d --name recash-mongo -p 27017:27017 mongo:7
docker run -d --name recash-redis -p 6379:6379 redis:7
```

> Alternatively, use existing/cloud instances (MongoDB Atlas, Redis Cloud, etc.) and set their URLs in `.env`.

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
# Database
RECASH_DATABASE_URI="mongodb://localhost:27017/recash"
REDIS_URL="redis://localhost:6379"

# Auth
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
AUTH_FACEBOOK_ID=""
AUTH_FACEBOOK_SECRET=""
NEXT_PUBLIC_GOOGLE_CLIENT_ID=""

# API / WebSocket
NEXT_PUBLIC_API_VERSION="v1"
NEXT_PUBLIC_WS_URL="ws://localhost:4000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional integrations
GEMINI_API_KEY=""
HUGGINGFACE_API_KEY=""
RESEND_API_KEY=""
RESEND_FROM_EMAIL="Recash <noreply@recash.ro>"

# AI assistant (optional) — without it, the in-app assistant returns a handled 503
ANTHROPIC_API_KEY=""
# Base URL the MCP server uses to reach the Recash REST API (defaults to http://localhost:3000)
RECASH_API_BASE="http://localhost:3000"
```

### 5. Sync the Prisma schema with MongoDB

```bash
pnpm prisma:push
```

### 6. (Optional) Seed the database with demo data

```bash
pnpm prisma:seed
```

### 7. Run the app in development mode

```bash
pnpm dev
```

This starts Next.js (`http://localhost:3000`) and the WebSocket server (`ws-server/`) concurrently.

### Production build

```bash
pnpm build
pnpm start
```

## 🤖 AI integrations (MCP + in-app assistant)

Recash exposes its marketplace to AI assistants through **one read-only tool
catalog** (`lib/ai/tools.ts`) consumed by two transports — a service-oriented
design where the same `/api/v1` REST API backs the web UI, the MCP server, and
the in-app assistant, with no duplicated business logic.

**Tools** (all read-only): `search_listings`, `get_listing`, `get_leaderboard`,
`get_user_reputation`, `estimate_earnings`, `get_platform_stats`. Exact
addresses/phones are never exposed — coordinates are approximated exactly as for
anonymous web visitors.

**MCP server** — talk to Recash from Claude Desktop or any MCP client. With the
app running:

```bash
RECASH_API_BASE=http://localhost:3000 pnpm mcp
```

See [`mcp-server/README.md`](mcp-server/README.md) for the Claude Desktop config.

**In-app assistant** — a floating chat widget backed by `/api/v1/assistant`
(Anthropic SDK tool-use loop, streamed responses). Set `ANTHROPIC_API_KEY` to
enable it; without the key it returns a handled 503 and the rest of the app is
unaffected.

## 🛠️ Troubleshooting

| Issue | Solution |
|---|---|
| `PrismaClientInitializationError` / MongoDB connection failed | Check `RECASH_DATABASE_URI`, make sure MongoDB is running and reachable (`docker ps`) |
| `[Redis] Connection Error` in the console | Check `REDIS_URL` and that the Redis container is running on the right port |
| WebSocket won't connect (chat/notifications don't update live) | Check `NEXT_PUBLIC_WS_URL` and that `ws-server` has started (it only runs separately from `next dev` if you're not using `pnpm dev`) |
| Google/Facebook login doesn't work | Fill in `AUTH_GOOGLE_ID/SECRET`, `AUTH_FACEBOOK_ID/SECRET`, and add `http://localhost:3000` as an authorized redirect URI in the Google/Facebook consoles |
| Errors related to the Prisma schema after changes | Re-run `pnpm prisma:push` (and `pnpm prisma generate` if needed) |
| AI bottle estimation doesn't work | Optional feature — requires `GEMINI_API_KEY` or `HUGGINGFACE_API_KEY`; without them, the endpoint returns a handled error |
| Emails aren't being sent | Optional feature — requires `RESEND_API_KEY`; without it, sending is silently skipped (logged to console) |
| In-app AI assistant returns "not configured" | Optional feature — requires `ANTHROPIC_API_KEY`; without it the assistant endpoint returns a handled 503 |
| MCP server can't reach the API | Make sure the Recash app is running and `RECASH_API_BASE` points at it (defaults to `http://localhost:3000`) |
| Ports already in use (3000 / 4000 / 27017 / 6379) | Stop the processes/containers using them, or change the ports in `.env` / Docker configuration |

## 📚 More information

For full documentation, check out the **[Recash Docs](https://docs.recash.ro)** website.
