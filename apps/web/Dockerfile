FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Cache dependency manifests first for layer caching
COPY package.json bun.lock ./
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

RUN bun install --frozen-lockfile

# Copy source code
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/web ./apps/web
COPY tsconfig* ./

WORKDIR /app/apps/web
RUN bun run build

# Runtime stage — also Bun so it understands Bun's module symlinks
FROM oven/bun:1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the full standalone output (contains node_modules/ with Bun symlinks)
COPY --from=builder /app/apps/web/.next/standalone ./
# Bun symlinks in /app/node_modules/ point 3 levels up: ../../../node_modules/.bun/
# That resolves to /node_modules/.bun/ — so we must copy there
COPY --from=builder /app/node_modules/.bun /node_modules/.bun
# server.js lives at /app/server.js — it expects static files at /app/.next/static
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/publi[c] ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run with Bun — it resolves its own symlinks correctly
CMD ["bun", "run", "server.js"]
