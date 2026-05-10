# ── Stage 1: deps + prisma generate ──────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk upgrade --no-cache
WORKDIR /app
COPY package.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate

# ── Stage 2: compile TypeScript ───────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk upgrade --no-cache
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma       ./prisma
COPY . .
RUN npm run build

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk upgrade --no-cache
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 wsuser
COPY --from=builder --chown=wsuser:nodejs /app/dist         ./dist
COPY --from=builder --chown=wsuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=wsuser:nodejs /app/prisma       ./prisma
USER wsuser
EXPOSE 4001
ENV WS_PORT=4001
CMD ["node", "dist/server.js"]