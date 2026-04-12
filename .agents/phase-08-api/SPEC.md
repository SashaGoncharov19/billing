# Фаза 08 — REST API Layer

## Мета фази

Зібрати всі модулі в єдиний, добре структурований ElysiaJS API з версіонуванням, consistent error handling, pagination, CORS, OpenAPI документацією.

---

## Залежності

- ✅ Фаза 03 (auth middleware)
- ✅ Фаза 04 (tenant middleware)
- ✅ Фаза 05 (billing module)
- ✅ Фаза 06 (invoices module)
- ✅ Фаза 07 (tickets module)

---

## Структура `apps/api/src/`

```
src/
├── index.ts                    ← точка входу, збирає всі routers
├── config.ts                   ← env validation
├── health.ts                   ← /health endpoint
│
├── modules/
│   ├── auth/
│   ├── tenants/
│   ├── billing/
│   ├── invoices/
│   ├── tickets/
│   └── admin/                  ← admin namespace
│
├── middleware/
│   ├── authenticate.ts
│   ├── authorize.ts
│   ├── tenant.ts
│   ├── rate-limit.ts
│   ├── request-id.ts           ← додає request_id до кожного request
│   └── error-handler.ts        ← глобальний error handler
│
├── providers/
│   ├── payment-provider.interface.ts
│   └── stripe/
│
├── lib/
│   ├── jwt.ts
│   ├── password.ts
│   ├── storage.ts
│   ├── idempotency.ts
│   ├── pagination.ts
│   └── audit.ts
│
└── templates/
    └── invoice.html.ts
```

---

## Головний `index.ts`

```typescript
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { config } from './config'
import { requestIdMiddleware } from './middleware/request-id'
import { errorHandler } from './middleware/error-handler'
import { healthRouter } from './health'
import { authRouter } from './modules/auth/auth.router'
import { tenantRouter } from './modules/tenants/tenant.router'
import { billingRouter } from './modules/billing/billing.router'
import { invoiceRouter } from './modules/invoices/invoice.router'
import { ticketRouter } from './modules/tickets/ticket.router'
import { adminRouter } from './modules/admin/admin.router'
import { webhookRouter } from './modules/billing/webhook.router'

const app = new Elysia()
  // Global middleware
  .use(cors({
    origin: config.ALLOWED_ORIGINS.split(','),
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id', 'X-Idempotency-Key'],
  }))
  .use(swagger({
    path: '/docs',
    documentation: {
      info: {
        title: 'Entity Seven API',
        version: '1.0.0',
        description: 'Entity Seven SaaS Billing Platform API',
      },
    },
  }))
  .use(requestIdMiddleware)
  .use(errorHandler)

  // Routes
  .use(healthRouter)
  .use(webhookRouter)      // /webhooks/* — без auth prefix

  // Versioned API
  .group('/api/v1', (app) =>
    app
      .use(authRouter)     // /api/v1/auth/*
      .use(tenantRouter)   // /api/v1/tenants/*
      .use(billingRouter)  // /api/v1/billing/*
      .use(invoiceRouter)  // /api/v1/invoices/*
      .use(ticketRouter)   // /api/v1/tickets/*
  )

  // Admin namespace
  .group('/api/admin', (app) =>
    app.use(adminRouter)
  )

  .listen(config.API_PORT)

console.log(`🚀 Entity Seven API running at http://localhost:${config.API_PORT}`)
console.log(`📚 API docs: http://localhost:${config.API_PORT}/docs`)

export type App = typeof app
```

---

## Request ID Middleware

```typescript
// middleware/request-id.ts
import { Elysia } from 'elysia'

export const requestIdMiddleware = new Elysia({ name: 'request-id' })
  .derive({ as: 'global' }, ({ headers }) => ({
    requestId: headers['x-request-id'] ?? crypto.randomUUID()
  }))
  .onAfterHandle({ as: 'global' }, ({ set, requestId }) => {
    set.headers['X-Request-Id'] = requestId
  })
```

---

## Global Error Handler

```typescript
// middleware/error-handler.ts
import { Elysia } from 'elysia'

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super('VALIDATION_ERROR', 'Validation failed', 422, details)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super('FORBIDDEN', message, 403)
  }
}

export class InvalidTransitionError extends AppError {
  constructor(message: string) {
    super('INVALID_TRANSITION', message, 422)
  }
}

export const errorHandler = new Elysia({ name: 'error-handler' })
  .onError({ as: 'global' }, ({ error, set, requestId }) => {
    // Structured error response
    if (error instanceof AppError) {
      set.status = error.statusCode
      return {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId,
      }
    }

    // Elysia validation errors
    if (error.name === 'ValidationError') {
      set.status = 422
      return {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.message,
        requestId,
      }
    }

    // Unknown errors
    console.error('[ERROR]', { requestId, error: error.message, stack: error.stack })
    set.status = 500
    return {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId,
    }
  })
```

---

## Consistent Error Format (СТАНДАРТ)

Всі помилки API мають повертати:

```json
{
  "code": "NOT_FOUND",
  "message": "Invoice not found",
  "details": null,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Коди HTTP статусів:**
| Код | Значення |
|-----|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content (delete) |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error / Invalid Transition |
| 429 | Too Many Requests |
| 500 | Internal Error |

---

## Cursor-Based Pagination

```typescript
// lib/pagination.ts

export interface PaginationParams {
  cursor?: string
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

export function encodeCursor(id: string, createdAt: Date): string {
  return Buffer.from(JSON.stringify({ id, createdAt: createdAt.toISOString() })).toString('base64url')
}

export function decodeCursor(cursor: string): { id: string; createdAt: Date } {
  const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString())
  return { id: decoded.id, createdAt: new Date(decoded.createdAt) }
}

export function paginate<T extends { id: string; createdAt: Date }>(
  items: T[],
  limit: number
): PaginatedResponse<T> {
  const hasMore = items.length > limit
  const data = hasMore ? items.slice(0, limit) : items
  const lastItem = data[data.length - 1]

  return {
    data,
    nextCursor: hasMore && lastItem ? encodeCursor(lastItem.id, lastItem.createdAt) : null,
    hasMore,
  }
}
```

**Приклад використання в query:**
```typescript
// Fetch limit + 1, щоб знати hasMore
const items = await db.select()
  .from(invoices)
  .where(and(
    eq(invoices.tenantId, tenant.id),
    cursor ? lt(invoices.createdAt, decodedCursor.createdAt) : undefined
  ))
  .orderBy(desc(invoices.createdAt))
  .limit(limit + 1)

return paginate(items, limit)
```

---

## Input Validation (Zod через Elysia)

```typescript
// Використовувати Elysia Type system з zod schemas

import { t } from 'elysia'

// В router:
.post('/invoices', async ({ body, tenant }) => {
  // body вже провалідований
}, {
  body: t.Object({
    currency: t.String({ minLength: 3, maxLength: 3 }),
    dueAt: t.Optional(t.String({ format: 'date-time' })),
    notes: t.Optional(t.String({ maxLength: 2000 })),
    items: t.Array(t.Object({
      description: t.String({ minLength: 1, maxLength: 500 }),
      quantity: t.Integer({ minimum: 1 }),
      unitPrice: t.String(),  // numeric string
      taxRate: t.Optional(t.String()),
      productId: t.Optional(t.String({ format: 'uuid' })),
    }), { minItems: 1 }),
  })
})
```

---

## Admin Namespace `/api/admin`

Окремий router з підвищеними вимогами безпеки:

```typescript
// modules/admin/admin.router.ts
export const adminRouter = new Elysia({ prefix: '/api/admin' })
  .use(authenticate)
  .use(requireRole('admin'))  // мінімум admin
  .derive(({ user }) => {
    if (user.role !== 'owner' && user.role !== 'admin') {
      throw new ForbiddenError('Admin access required')
    }
    return {}
  })

  // Admin-only routes
  .get('/tenants', getAllTenants)         // superadmin: всі тенанти
  .get('/users', getAllUsers)             // всі users
  .get('/audit-logs', getAuditLogs)      // audit log viewer
  .get('/billing/overview', getBillingOverview)  // revenue overview
```

**Всі admin дії обов'язково записуються в audit_log.**

---

## Rate Limiting Configuration

| Ендпоінт | Ліміт | Вікно |
|---------|-------|-------|
| `POST /auth/login` | 5 | 15 хвилин |
| `POST /auth/register` | 3 | 1 година |
| `POST /auth/refresh` | 20 | 15 хвилин |
| `POST /webhooks/*` | 100 | 1 хвилина |
| `GET /api/v1/*` | 100 | 1 хвилина |
| `POST /api/v1/*` | 30 | 1 хвилина |
| `GET /api/admin/*` | 50 | 1 хвилина |

---

## Health Endpoint

```typescript
// health.ts
import { Elysia } from 'elysia'
import { db } from '@entityseven/db'
import { redis } from './lib/redis'

export const healthRouter = new Elysia()
  .get('/health', async () => {
    const checks = await Promise.allSettled([
      db.execute(sql`SELECT 1`),          // DB check
      redis.ping(),                          // Redis check
    ])

    const [dbCheck, redisCheck] = checks

    return {
      status: checks.every(c => c.status === 'fulfilled') ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env['APP_VERSION'] ?? '0.0.1',
      services: {
        database: dbCheck.status === 'fulfilled' ? 'ok' : 'error',
        redis: redisCheck.status === 'fulfilled' ? 'ok' : 'error',
      }
    }
  })
```

---

## OpenAPI / Swagger

- Swagger UI доступний на `/docs`
- Описати всі ендпоінти з `detail` в Elysia:

```typescript
.post('/invoices', handler, {
  body: InvoiceCreateSchema,
  detail: {
    tags: ['Invoices'],
    summary: 'Create invoice',
    description: 'Creates a new invoice in draft status for the current tenant',
  }
})
```

---

## Response Headers (стандарт)

Кожна відповідь має містити:
- `X-Request-Id: uuid` — ідентифікатор запиту
- `X-Response-Time: Nms` — час обробки
- `Content-Type: application/json` — для JSON ендпоінтів

---

## Definition of Done

- [ ] Всі модулі зібрані в єдиний ElysiaJS app
- [ ] `/api/v1/*` версіонований namespace
- [ ] `/api/admin/*` з підвищеним RBAC
- [ ] Consistent error format для всіх помилок
- [ ] `X-Request-Id` в кожному response
- [ ] Cursor-based pagination реалізована
- [ ] Zod/Elysia validation на всіх input
- [ ] CORS налаштований коректно
- [ ] Swagger UI доступний на `/docs`
- [ ] `/health` перевіряє DB та Redis
- [ ] Rate limiting на auth та API endpoints

---

## Наступна фаза

➡️ [Фаза 09 — Frontend (Next.js)](../phase-09-frontend/SPEC.md)
