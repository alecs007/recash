# Contributing to Recash

Thanks for your interest in Recash. Bug reports, fixes and feature ideas are all
welcome.

## Getting set up

Follow the [local installation steps in the README](README.md#-local-installation--setup).
In short: `pnpm install`, start MongoDB and Redis, `cp .env.example .env`,
`pnpm prisma:push`, then `pnpm dev`.

The app runs without any of the optional API keys — AI estimation, the in-app
assistant and email all degrade gracefully when their key is missing — so you
don't need third-party accounts to work on most of the codebase.

## Before opening a pull request

Run the same checks CI does:

```bash
pnpm lint       # ESLint; warnings fail the build too (--max-warnings 0)
pnpm typecheck  # tsc --noEmit
pnpm test       # Vitest unit + integration
pnpm build
```

The end-to-end suites are heavier and need browsers installed:

```bash
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
pnpm test:e2e:full
```

`test:e2e:full` needs no database or network — it runs the whole collection flow
over authenticated API requests against an in-memory MongoDB replica set and an
in-process Redis, both started by Playwright's global setup.

## Pull requests

- Branch off `main` and keep each PR focused on one change.
- Describe what changed and why. Link an issue when there is one.
- Add or update tests for behaviour you change. Unit and integration tests live
  in `tests/`, browser flows in `e2e/`, and the full-stack flow in `e2e-full/`.
- Update the README or `.env.example` when you add configuration or change setup
  steps.
- CI must be green before a PR is merged.

## Code style

ESLint and TypeScript are the source of truth — run `pnpm lint` and fix what it
reports rather than matching a separate style guide. Match the conventions of the
file you're editing: naming, comment density, and how the surrounding code is
structured.

A note specific to this project: **the Next.js version here is newer than most
references and has breaking changes.** Before writing code against a Next.js
API, check the bundled docs in `node_modules/next/dist/docs/` rather than relying
on older tutorials or memory. See [AGENTS.md](AGENTS.md).

## Architecture notes

`/api/v1` is the single service layer: the web UI, the standalone MCP server and
the in-app assistant all go through it, sharing one read-only tool catalog in
`lib/ai/tools.ts`. When adding an AI-facing capability, extend that catalog
instead of duplicating business logic in a transport.

Anything that exposes listing data must keep the existing privacy behaviour:
exact addresses and phone numbers are never returned, and coordinates are
approximated the same way they are for anonymous web visitors.

## Reporting bugs

Open an issue with steps to reproduce, what you expected, and what happened.
Include your OS, Node version, and relevant console or server output.

For anything security-related, **don't open a public issue** — see
[SECURITY.md](SECURITY.md).
