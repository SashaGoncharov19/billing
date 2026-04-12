# Фаза 12 — Observability

## Мета фази

Реалізувати structured logging, request tracing, health checks, та метрики для production-ready системи.

---

## Залежності

- ✅ Фаза 01 (project setup)
- Може бути впроваджена паралельно з іншими фазами

---

## Компоненти

1. **Structured Logging (JSON)** — pino
2. **Request Tracing** — request_id propagation
3. **Health Endpoint** — DB + Redis + queues
4. **Error Tracking** — Sentry
5. **Metrics** — latency, error rate, queue depth

---

## Structured Logging (Pino)

```typescript
// lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    app: 'entityseven-api',
    env: process.env['NODE_ENV'],
    version: process.env['APP_VERSION'] ?? '0.0.1',
  },
  // В production: JSON output
  // В development: pretty print
  transport: process.env['NODE_ENV'] === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
})
```

### Логування зі стандартними полями

```typescript
// Правильний формат логу
logger.info({
  requestId: '550e8400-uuid',
  tenantId: 'tenant-uuid',
  userId: 'user-uuid',
  action: 'invoice.created',
  invoiceId: 'invoice-uuid',
  duration: 45,
}, 'Invoice created successfully')

// Формат JSON output:
// {
//   "level": "info",
//   "time": "2024-01-15T14:30:00.000Z",
//   "app": "entityseven-api",
//   "env": "production",
//   "requestId": "550e8400-uuid",
//   "tenantId": "tenant-uuid",
//   "userId": "user-uuid",
//   "action": "invoice.created",
//   "invoiceId": "invoice-uuid",
//   "duration": 45,
//   "msg": "Invoice created successfully"
// }
```

---

## Request Logging Middleware

```typescript
// middleware/request-logger.ts
import { Elysia } from 'elysia'
import { logger } from '../lib/logger'

export const requestLogger = new Elysia({ name: 'request-logger' })
  .onRequest({ as: 'global' }, ({ request, requestId }) => {
    const url = new URL(request.url)
    logger.info({
      requestId,
      method: request.method,
      path: url.pathname,
      query: url.search,
    }, 'Request received')
  })
  .onAfterHandle({ as: 'global' }, ({ request, set, requestId, store }) => {
    const url = new URL(request.url)
    const duration = Date.now() - (store as any).startTime

    logger.info({
      requestId,
      method: request.method,
      path: url.pathname,
      status: set.status,
      duration,
    }, 'Request completed')
  })
  .onError({ as: 'global' }, ({ request, error, requestId }) => {
    const url = new URL(request.url)
    logger.error({
      requestId,
      method: request.method,
      path: url.pathname,
      error: error.message,
      stack: error.stack,
    }, 'Request failed')
  })
```

---

## Log Levels

| Level | Коли використовувати |
|-------|---------------------|
| `trace` | Детальна відладка (лише dev) |
| `debug` | SQL queries, external API calls (dev + staging) |
| `info` | Нормальні операції: request completed, job enqueued |
| `warn` | Підозріла ситуація: rate limit hit, deprecated usage |
| `error` | Помилка що не є очікуваною: DB fail, external API error |
| `fatal` | Критична помилка що зупиняє app |

---

## Health Endpoint `/health`

```typescript
// health.ts
import { Elysia } from 'elysia'

interface ServiceStatus {
  status: 'ok' | 'error' | 'degraded'
  latency?: number
  error?: string
}

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error'
  timestamp: string
  version: string
  uptime: number
  services: {
    database: ServiceStatus
    redis: ServiceStatus
    queue: ServiceStatus
  }
}

export const healthRouter = new Elysia()
  .get('/health', async (): Promise<HealthResponse> => {
    const checks = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkQueues(),
    ])

    const [database, redis, queue] = checks
    const allOk = checks.every(c => c.status === 'ok')
    const anyError = checks.some(c => c.status === 'error')

    return {
      status: allOk ? 'ok' : anyError ? 'error' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env['APP_VERSION'] ?? '0.0.1',
      uptime: process.uptime(),
      services: { database, redis, queue },
    }
  })

async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    await db.execute(sql`SELECT 1`)
    return { status: 'ok', latency: Date.now() - start }
  } catch (error) {
    return { status: 'error', error: String(error) }
  }
}

async function checkRedis(): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    await redis.ping()
    return { status: 'ok', latency: Date.now() - start }
  } catch (error) {
    return { status: 'error', error: String(error) }
  }
}

async function checkQueues(): Promise<ServiceStatus> {
  try {
    // Перевірити що можна підʼєднатись до BullMQ
    const count = await emailQueue.count()
    return { status: 'ok', latency: count }
  } catch (error) {
    return { status: 'error', error: String(error) }
  }
}
```

**SLO Target:** `/health` відповідає < 500ms, 99.9% uptime

---

## Error Tracking (Sentry)

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/bun'

if (process.env['SENTRY_DSN'] && process.env['NODE_ENV'] === 'production') {
  Sentry.init({
    dsn: process.env['SENTRY_DSN'],
    environment: process.env['NODE_ENV'],
    release: process.env['APP_VERSION'],
    tracesSampleRate: 0.1,  // 10% trace sampling
    beforeSend(event) {
      // Видаляти чутливі дані
      if (event.request?.data) {
        delete (event.request.data as any).password
        delete (event.request.data as any).cardNumber
      }
      return event
    },
  })
}

export function captureException(error: Error, context?: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value)
      })
    }
    Sentry.captureException(error)
  })
}
```

In error handler:
```typescript
.onError({ as: 'global' }, ({ error, requestId, user }) => {
  if (!(error instanceof AppError) || error.statusCode === 500) {
    captureException(error instanceof Error ? error : new Error(String(error)), {
      requestId,
      userId: user?.id,
    })
  }
})
```

---

## Metrics (Simple Implementation)

Базові метрики через custom implementation або prometheus-клієнт:

```typescript
// lib/metrics.ts

// Простий in-memory counter для dev
// В production — Prometheus або DataDog
const metrics = {
  requestCount: 0,
  errorCount: 0,
  requestDurations: [] as number[],
}

export function recordRequest(duration: number, isError: boolean) {
  metrics.requestCount++
  metrics.requestDurations.push(duration)
  if (isError) metrics.errorCount++

  // Keep only last 1000
  if (metrics.requestDurations.length > 1000) {
    metrics.requestDurations.shift()
  }
}

export function getMetrics() {
  const durations = metrics.requestDurations
  const p95 = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)] ?? 0
  const p99 = durations[Math.floor(durations.length * 0.99)] ?? 0

  return {
    requestCount: metrics.requestCount,
    errorCount: metrics.errorCount,
    errorRate: metrics.requestCount > 0
      ? (metrics.errorCount / metrics.requestCount * 100).toFixed(2) + '%'
      : '0%',
    latency: { p95, p99 },
  }
}
```

**Endpoint `/metrics`** (для internal monitoring, не public):
```typescript
.get('/metrics', () => getMetrics(), {
  // Захистити API key або IP whitelist
})
```

---

## SLO Targets

| Метрика | Target |
|---------|--------|
| API Uptime | 99.9% |
| API Latency p95 | < 300ms |
| API Latency p99 | < 1000ms |
| `/health` availability | 99.99% |
| Error Rate | < 1% |
| Queue lag | < 60s |

---

## Log Aggregation (Production)

В production налаштувати:
- **Stdout → JSON** (Docker/K8s збирає логи)
- **Forwarding** до Loki + Grafana або Datadog або Logtail

Локальний розвиток: pino-pretty для читабельного output.

---

## Definition of Done

- [ ] Pino logger з JSON output в production
- [ ] Request logging middleware (request/response log)
- [ ] `request_id` propagated в кожний лог
- [ ] `GET /health` перевіряє DB, Redis, Queues
- [ ] Health endpoint відповідає < 200ms
- [ ] Sentry integration (помилки в production)
- [ ] Log levels правильно виставлені
- [ ] Sensitive data не логується (паролі, картки)
- [ ] Uptime monitoring через health endpoint

---

## Наступна фаза

➡️ [Фаза 13 — Testing & CI](../phase-13-testing/SPEC.md)
