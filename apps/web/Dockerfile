FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Cache dependencies
COPY package.json bun.lock ./
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
# We copy API to ensure Eden references works
COPY apps/api/package.json ./apps/api/

RUN bun install --frozen-lockfile

# Copy codebase
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/web ./apps/web
COPY tsconfig* ./

WORKDIR /app/apps/web
# Requires DATABASE_URL mapping optionally if build requires DB connections
# ENV DATABASE_URL=xxx 
RUN bun run build

# Standalone execution runtime using Node.js for Next.js stability
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build
# Note Next standalone puts things in /app/apps/web/.next/standalone relative to monorepo root
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Note: The standalone output expects to run server.js from its root. Because of monorepo, Next output places server.js in apps/web/server.js
CMD ["node", "apps/web/server.js"]
