# E2E tests (Playwright)

"Light" end-to-end scope: smoke coverage of the public UI. Specs run against a
real Next dev server (started automatically by `playwright.config.ts`) but never
require a live backend:

- **Public pages** (home) render server-side and degrade gracefully when the DB
  is unavailable, so they load with no MongoDB/Redis.
- **Data-driven pages** (map) fetch client-side via SWR, so we intercept those
  requests with `page.route()` and return deterministic fixtures.
- **Auth guards** (e.g. `/post`) are verified by asserting the unauthenticated
  redirect.

## Running

```bash
pnpm test:e2e          # headless
pnpm test:e2e:ui       # Playwright UI mode
```

The dev server is launched on port **3100**. Locally, `.env.local` supplies the
environment; in CI, dummy values are injected (see `.github/workflows/ci.yml`).

## Not covered here (and why)

The full authenticated flow — **create → claim → approve → complete-with-code** —
is exercised at the API/handler level by the Vitest integration tests in
`tests/integration/` (with Prisma/Redis mocked). Driving that same flow through
the browser needs:

1. A signed NextAuth session cookie for two users (poster + collector). Because
   the app uses the JWT session strategy, a cookie can be minted in a Playwright
   `globalSetup` with `encode()` from `@auth/core/jwt` using `AUTH_SECRET`, then
   attached via `storageState` — no Google OAuth round-trip required.
2. A real MongoDB replica set (needed for `prisma.$transaction`) and Redis
   (holds the one-time confirmation code), seeded before the run.

When that infrastructure is added, replace the skipped test in
`post-creation.spec.ts` with the real flow.
