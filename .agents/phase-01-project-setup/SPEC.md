# Фаза 01 — Project Setup & Monorepo

## Мета фази

Ініціалізувати production-ready проект з монорепо структурою, правильним toolchain і локальною інфраструктурою (PostgreSQL, Redis).

---

## Tech Stack (ОБОВ'ЯЗКОВО)

| Шар | Технологія | Версія |
|-----|-----------|--------|
| Package Manager | bun | latest |
| Monorepo | bun workspaces | — |
| Runtime (API) | Bun | latest |
| Framework | ElysiaJS | latest |
| Language | TypeScript strict | 5.x |
| ORM | Drizzle ORM | latest |
| Database | PostgreSQL | 16 |
| Cache/Queue | Redis | 7 |
| Linter | ESLint + typescript-eslint | latest |
| Formatter | Prettier | latest |

---

## Структура проекту (ТОЧНА)

```
entityseven-billing/
├── .env.example                 ← всі env змінні з описом
├── .gitignore
├── .eslintrc.json               ← глобальний ESLint config
├── .prettierrc                  ← глобальний Prettier config
├── package.json                 ← root package (workspaces)
├── package.json                 ← root package (workspaces config via "workspaces" field)
├── tsconfig.base.json           ← базовий TS config успадковується усіма
├── docker-compose.yml           ← PostgreSQL + Redis
├── Makefile                     ← dev shortcuts
│
├── apps/
│   ├── api/                     ← Bun + ElysiaJS backend
│   │   ├── package.json
│   │   ├── tsconfig.json        ← extends ../../tsconfig.base.json
│   │   ├── src/
│   │   │   ├── index.ts         ← точка входу ElysiaJS app
│   │   │   ├── config.ts        ← валідація env через zod
│   │   │   └── health.ts        ← /health endpoint
│   │   └── .env                 ← локальні env (gitignored)
│   │
│   └── web/                     ← Next.js frontend
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       └── src/
│           └── app/
│               └── page.tsx
│
└── packages/
    ├── db/                      ← Drizzle ORM + schemas + migrations
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── drizzle.config.ts
    │   └── src/
    │       ├── index.ts         ← експортує db instance та всі schemas
    │       ├── client.ts        ← підключення до PostgreSQL
    │       └── schema/          ← таблиці (кожна в окремому файлі)
    │
    ├── shared/                  ← спільні типи, константи, утиліти
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts
    │       ├── types.ts
    │       └── constants.ts
    │
    └── config/                  ← спільна конфігурація (eslint, ts, prettier)
        ├── eslint-config/
        └── ts-config/
```

---

## Файли конфігурації

### Workspace config (root `package.json`)
```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

### `tsconfig.base.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### `docker-compose.yml`
```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: entityseven_postgres
    environment:
      POSTGRES_USER: entityseven
      POSTGRES_PASSWORD: entityseven_dev
      POSTGRES_DB: entityseven_billing
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U entityseven -d entityseven_billing"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: entityseven_redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### `.env.example`
```env
# Database
DATABASE_URL=postgresql://entityseven:entityseven_dev@localhost:5432/entityseven_billing

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=change_me_in_production_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Storage (S3/R2)
STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
STORAGE_BUCKET=entityseven-files
STORAGE_REGION=auto

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App
NODE_ENV=development
API_PORT=3001
WEB_PORT=3000
API_URL=http://localhost:3001
WEB_URL=http://localhost:3000

# Sentry (optional)
SENTRY_DSN=
```

### `Makefile`
```makefile
.PHONY: dev db-up db-down db-reset migrate seed lint test

dev:
	docker-compose up -d && bun dev

db-up:
	docker-compose up -d postgres redis

db-down:
	docker-compose down

db-reset:
	docker-compose down -v && docker-compose up -d postgres redis

migrate:
	cd packages/db && bun db:push

seed:
	cd packages/db && bun db:seed

lint:
	bun lint

test:
	bun test
```

---

## `apps/api/src/index.ts` — стартова точка

```typescript
import { Elysia } from 'elysia'
import { config } from './config'
import { healthRouter } from './health'

const app = new Elysia()
  .use(healthRouter)
  .listen(config.API_PORT)

console.log(`🚀 API running at http://localhost:${config.API_PORT}`)

export type App = typeof app
```

## `apps/api/src/config.ts` — валідація env

```typescript
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  API_PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
})

export const config = envSchema.parse(process.env)
export type Config = typeof config
```

---

## Root `package.json` скрипти

```json
{
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "bun run --filter '*' dev",
    "build": "bun run --filter '*' build",
    "lint": "bun run --filter '*' lint",
    "test": "bun test",
    "type-check": "bun run --filter '*' type-check"
  }
}
```

---

## Критичні правила фази

1. **TypeScript strict mode скрізь** — `"strict": true` + `noUncheckedIndexedAccess`
2. **Жодних secrets в коді** — тільки через `.env`
3. **Zod для валідації env** — якщо змінна відсутня, app не стартує
4. **Docker Compose обов'язковий** — локальна інфра тільки через Docker
5. **Bun workspaces** — ніяких npm, yarn або pnpm

---

## Definition of Done (DoD)

- [ ] `bun install` проходить без помилок
- [ ] `docker-compose up -d` піднімає Postgres 16 та Redis 7
- [ ] `bun dev` паралельно стартує API (:3001) та Web (:3000)
- [ ] `GET /health` повертає `{ status: 'ok', timestamp: '...' }`
- [ ] `bun run type-check` без помилок
- [ ] `bun lint` без помилок
- [ ] Структура папок відповідає схемі вище
- [ ] `.env.example` містить всі необхідні змінні

---

## Наступна фаза

➡️ [Фаза 02 — Database Schema & Migrations](../phase-02-database/SPEC.md)
