# Load & scalability tests (k6)

These tests measure how recash behaves under concurrent traffic and whether it
degrades **gracefully** (sheds load with `429`) or **cedes** (`5xx` / timeouts)
when overloaded.

They use [k6](https://k6.io) — a load-testing tool scripted in JavaScript. k6 is
a standalone binary, **not** an npm package.

## 1. Install k6

```bash
# Windows
winget install k6 --source winget      # or: choco install k6

# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo apt-get install k6                 # after adding the k6 apt repo

# Or without installing — via Docker:
docker run --rm -i grafana/k6 run - < load/smoke.js
```

## 2. Start a realistic target

Numbers from `next dev` are **meaningless** (dev mode is unoptimised and
single-purpose). Load-test a production build backed by real MongoDB + Redis:

```bash
pnpm build
pnpm start            # serves the production build on :3000
```

Point the tests elsewhere (e.g. a staging deploy) with `BASE_URL`:

```bash
k6 run -e BASE_URL=https://staging.recash.ro load/load.js
```

## 3. Run

```bash
pnpm load:smoke        # 1 VU, 30s — sanity check, run this first
pnpm load              # sustained 50 VUs — SLO check at expected scale
pnpm load:stress       # ramps to 4× to find the breaking point
pnpm load:spike        # sudden burst + recovery
pnpm load:ratelimit    # floods one IP — verifies graceful 429 shedding
```

Useful overrides: `-e VUS=100` (peak users), `-e P95_MS=500` (latency SLO),
`-e STEP=200` (stress step size).

## What each scenario checks

| Scenario | Question it answers | Pass condition |
|---|---|---|
| `smoke` | Do the endpoints work at all? | 200s, p95 < 800ms |
| `load` | Healthy at expected scale? | error rate < 1%, p95 < SLO, **0** 5xx |
| `stress` | Where is the breaking point? | *informational* — reports where it degrades |
| `spike` | Survives a viral burst and **recovers**? | **0** 5xx; latency returns to baseline |
| `ratelimit` | Overloaded → shed or cede? | many **429s**, **0** 5xx / timeouts |

The key distinction the suite draws: **`429` = the app protecting itself
(good)**, **`5xx`/timeout = the app ceding (bad)**. Thresholds fail the run only
on real failures, never on `429`.

## Scope & caveats

- **Read-only.** Scenarios hit `GET /api/v1/posts` and `GET /api/v1/leaderboard`
  only — they never mutate data, so they are safe against a populated DB.
- **Simulated client IPs.** The API rate-limits per client IP taken from
  `X-Forwarded-For`. Each VU sends a unique IP so the test measures app
  throughput, not one rate-limit bucket. (Note: the app trusts this header
  unconditionally, so in production a trusted proxy should overwrite it.)
- **Write-path load** (create → claim → approve → complete) needs authenticated
  sessions. Because the app uses the JWT session strategy, tokens can be minted
  with `AUTH_SECRET` and sent as a `Cookie` header. This is intentionally left
  out of the default suite because it **writes data** and needs a disposable
  seeded database — add it against a throwaway environment only.

## Known scalability hotspots to watch

- **Leaderboard** (`app/api/v1/leaderboard/route.ts`) and the home leaderboard
  component load **every user** into memory and sort there, instead of sorting +
  paginating in MongoDB. This is O(users) per request and is the most likely
  first bottleneck as the user base grows — the `stress` scenario targets it.
- The public feed sets `Cache-Control: s-maxage=15`, so behind a CDN most feed
  reads never reach the origin. Load-testing the origin directly (as here)
  measures the worst case with the cache bypassed.
