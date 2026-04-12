FROM oven/bun:1-alpine AS base

WORKDIR /app

# Install dependency files first to cache layer
COPY package.json bun.lock ./
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install exact node modules via bun
RUN bun install --frozen-lockfile

# Copy source code
COPY packages ./packages
COPY apps/api ./apps/api

# Typescript configurations (shared base)
COPY tsconfig* ./

# Set to process isolated
WORKDIR /app/apps/api

ENV NODE_ENV production
ENV PORT 3001

EXPOSE 3001

CMD ["bun", "run", "src/index.ts"]
