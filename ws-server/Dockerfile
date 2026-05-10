# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk upgrade --no-cache
WORKDIR /app
COPY package.json ./
RUN npm install

# ── Stage 2: compile TypeScript ───────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk upgrade --no-cache
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json server.ts ./
RUN npx tsc

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk upgrade --no-cache
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 wsuser
COPY --from=builder --chown=wsuser:nodejs /app/dist         ./dist
COPY --from=deps    --chown=wsuser:nodejs /app/node_modules ./node_modules
USER wsuser

# Railway injects PORT automatically; WS_PORT is the local-dev fallback
EXPOSE 4001
CMD ["node", "dist/server.js"]