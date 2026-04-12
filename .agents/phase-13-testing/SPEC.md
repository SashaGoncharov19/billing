# Фаза 13 — Testing & CI

## Мета фази

Реалізувати повну тестову стратегію: unit тести, integration тести, E2E тести та GitHub Actions CI pipeline.

---

## Залежності

- ✅ Всі попередні фази

---

## Test Stack

| Тип | Інструмент |
|-----|-----------|
| Unit / Integration (API) | Bun test runner |
| E2E | Playwright |
| Mock DB | Postgres (test container або окрема test DB) |
| Mock External APIs | msw (Mock Service Worker) або manual mocks |
| Coverage | `bun test --coverage` |

---

## Test Database Setup

Тести НЕ використовують production DB. Окрема test база:

```typescript
// test/helpers/db.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@entityseven/db/schema'

const TEST_DATABASE_URL = process.env['TEST_DATABASE_URL']
  ?? 'postgresql://entityseven:entityseven_dev@localhost:5432/entityseven_test'

const sql = postgres(TEST_DATABASE_URL)
export const testDb = drizzle(sql, { schema })

export async function resetDb() {
  // Очистити всі таблиці перед кожним тестом
  await testDb.execute(sql`
    TRUNCATE TABLE
      users, tenants, memberships, invoices, invoice_items,
      payments, subscriptions, products, tickets, ticket_comments,
      audit_logs, idempotency_keys
    RESTART IDENTITY CASCADE
  `)
}
```

---

## Unit Тести

### `auth.service.test.ts`

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { AuthService } from '../src/modules/auth/auth.service'
import { resetDb } from './helpers/db'

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(async () => {
    await resetDb()
    authService = new AuthService(testDb)
  })

  describe('register', () => {
    it('creates a user with hashed password', async () => {
      const result = await authService.register({
        email: 'test@example.com',
        password: 'SecurePass123!',
      })

      expect(result.user.email).toBe('test@example.com')
      expect(result.accessToken).toBeDefined()
      // Перевіряємо що пароль захешований і не рівний вихідному
      const user = await testDb.query.users.findFirst({...})
      expect(user?.passwordHash).not.toBe('SecurePass123!')
    })

    it('throws ConflictError if email already exists', async () => {
      await authService.register({ email: 'test@example.com', password: 'Pass123!' })

      await expect(
        authService.register({ email: 'test@example.com', password: 'Pass123!' })
      ).rejects.toThrow('ConflictError')
    })
  })

  describe('login', () => {
    it('returns tokens on valid credentials', async () => {
      await authService.register({ email: 'test@example.com', password: 'Pass123!' })
      const result = await authService.login({ email: 'test@example.com', password: 'Pass123!' })

      expect(result.accessToken).toBeDefined()
    })

    it('throws same error for wrong password and non-existent email', async () => {
      // SECURITY: same error message to prevent user enumeration
      const err1 = await authService.login({ email: 'nonexistent@test.com', password: 'Pass123!' }).catch(e => e)
      const err2 = await authService.login({ email: 'test@example.com', password: 'WrongPass!' }).catch(e => e)

      expect(err1.message).toBe(err2.message)
    })
  })
})
```

### `invoice.service.test.ts`

```typescript
describe('InvoiceService - calculations', () => {
  it('calculates subtotal, tax, and total correctly', () => {
    const items = [
      { description: 'Item 1', quantity: 2, unitPrice: '50.00', taxRate: '0.20' },
      { description: 'Item 2', quantity: 1, unitPrice: '30.00', taxRate: '0.00' },
    ]

    const result = calculateInvoiceTotals(items)

    expect(result.subtotalAmount).toBe('130.00')  // 2*50 + 30
    expect(result.taxAmount).toBe('20.00')         // 2*50*0.20
    expect(result.totalAmount).toBe('150.00')      // 130 + 20
  })
})

describe('InvoiceService - state machine', () => {
  it('allows draft → open transition', () => {
    expect(() => validateTransition('draft', 'open')).not.toThrow()
  })

  it('forbids paid → void transition', () => {
    expect(() => validateTransition('paid', 'void')).toThrow('InvalidTransitionError')
  })

  it('forbids void → any transition', () => {
    expect(() => validateTransition('void', 'open')).toThrow('InvalidTransitionError')
    expect(() => validateTransition('void', 'paid')).toThrow('InvalidTransitionError')
  })
})

describe('Invoice numbering - race condition', () => {
  it('assigns unique sequential numbers under concurrent requests', async () => {
    const CONCURRENT = 10
    const promises = Array.from({ length: CONCURRENT }, () =>
      invoiceService.create({ tenantId: testTenantId, items: [...] })
    )

    const results = await Promise.all(promises)
    const numbers = results.map(r => r.number)
    const uniqueNumbers = new Set(numbers)

    expect(uniqueNumbers.size).toBe(CONCURRENT)  // всі унікальні
    expect(Math.max(...numbers) - Math.min(...numbers)).toBe(CONCURRENT - 1)  // послідовні
  })
})
```

### `billing.service.test.ts`

```typescript
describe('Billing - idempotency', () => {
  it('returns cached result for duplicate webhook event', async () => {
    const processorMock = mock(() => ({ success: true }))

    // Перший call
    await withIdempotency('event_123', 'webhook', processorMock)
    // Другий call з тим самим ключем
    await withIdempotency('event_123', 'webhook', processorMock)

    // Processor має бути викликаний лише раз
    expect(processorMock).toHaveBeenCalledTimes(1)
  })
})
```

---

## Integration Тести (API)

### Налаштування API test client

```typescript
// test/helpers/api.ts
import { app } from '../../src/index'
import { treaty } from '@elysiajs/eden'

export const api = treaty(app)

// Хелпер для authenticated requests
export async function loginAs(email: string, password: string) {
  const { data } = await api.api.v1.auth.login.post({ email, password })
  return data?.accessToken
}

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}
```

### Auth Integration Tests

```typescript
// test/integration/auth.test.ts
describe('Auth API', () => {
  beforeEach(resetDb)

  it('POST /auth/register — creates user and returns accessToken', async () => {
    const { status, data } = await api.api.v1.auth.register.post({
      email: 'test@example.com',
      password: 'SecurePass123!',
    })

    expect(status).toBe(201)
    expect(data?.accessToken).toBeDefined()
    expect(data?.user.email).toBe('test@example.com')
  })

  it('POST /auth/login — returns 401 for bad credentials', async () => {
    const { status } = await api.api.v1.auth.login.post({
      email: 'nonexistent@example.com',
      password: 'WrongPass!',
    })

    expect(status).toBe(401)
  })

  it('GET /auth/me — returns 401 without token', async () => {
    const { status } = await api.api.v1.auth.me.get()
    expect(status).toBe(401)
  })

  it('GET /auth/me — returns user info with valid token', async () => {
    // Setup
    await api.api.v1.auth.register.post({ email: 'test@example.com', password: 'Pass123!' })
    const { data: loginData } = await api.api.v1.auth.login.post({
      email: 'test@example.com',
      password: 'Pass123!',
    })
    const token = loginData!.accessToken

    // Test
    const { status, data } = await api.api.v1.auth.me.get({
      headers: authHeaders(token)
    })

    expect(status).toBe(200)
    expect(data?.email).toBe('test@example.com')
  })
})
```

### Invoice Integration Tests

```typescript
describe('Invoices API', () => {
  let adminToken: string
  let tenantId: string

  beforeEach(async () => {
    await resetDb()
    // Setup: create tenant + admin user
    const { adminToken: token, tenantId: tid } = await setupTestTenant()
    adminToken = token
    tenantId = tid
  })

  it('POST /invoices — creates invoice in draft status', async () => {
    const { status, data } = await api.api.v1.invoices.post({
      body: {
        currency: 'USD',
        items: [{ description: 'Test Item', quantity: 1, unitPrice: '100.00' }]
      },
      headers: authHeaders(adminToken)
    })

    expect(status).toBe(201)
    expect(data?.status).toBe('draft')
    expect(data?.totalAmount).toBe('100.00')
  })

  it('POST /invoices/:id/issue — transitions to open and assigns number', async () => {
    // Create invoice
    const { data: invoice } = await createTestInvoice(adminToken)

    // Issue it
    const { status, data } = await api.api.v1.invoices[invoice!.id].issue.post({
      headers: authHeaders(adminToken)
    })

    expect(status).toBe(200)
    expect(data?.status).toBe('open')
    expect(data?.number).toBeGreaterThan(0)
    expect(data?.issuedAt).toBeDefined()
  })

  it('Tenant isolation — cannot access other tenant invoices', async () => {
    // Create invoice for tenant A
    const { data: invoice } = await createTestInvoice(adminToken)

    // Try to access with different tenant's token
    const { adminToken: otherToken } = await setupTestTenant()
    const { status } = await api.api.v1.invoices[invoice!.id].get({
      headers: authHeaders(otherToken)
    })

    expect(status).toBe(404)  // НЕ 403, щоб не розкривати існування
  })
})
```

### Billing / Webhook Integration Tests

```typescript
describe('Stripe Webhooks', () => {
  it('POST /webhooks/stripe — rejects invalid signature', async () => {
    const { status } = await api.webhooks.stripe.post({
      body: JSON.stringify({ type: 'payment_intent.succeeded' }),
      headers: { 'Stripe-Signature': 'invalid_signature' }
    })

    expect(status).toBe(401)
  })

  it('POST /webhooks/stripe — accepts valid event and returns 200', async () => {
    const { payload, signature } = createMockStripeEvent('checkout.session.completed')

    const { status } = await api.webhooks.stripe.post({
      body: payload,
      headers: { 'Stripe-Signature': signature }
    })

    expect(status).toBe(200)
  })

  it('POST /webhooks/stripe — duplicate event is idempotent', async () => {
    const { payload, signature } = createMockStripeEvent('checkout.session.completed', 'evt_123')

    await api.webhooks.stripe.post({ body: payload, headers: { 'Stripe-Signature': signature } })
    const { status } = await api.webhooks.stripe.post({ body: payload, headers: { 'Stripe-Signature': signature } })

    expect(status).toBe(200)
    // Verify only one job was queued
  })
})
```

---

## E2E Тести (Playwright)

```typescript
// test/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('user can register and login', async ({ page }) => {
    await page.goto('/register')

    await page.fill('[name="email"]', 'e2e@example.com')
    await page.fill('[name="password"]', 'SecurePass123!')
    await page.click('[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('protected pages redirect to login', async ({ page }) => {
    await page.goto('/invoices')
    await expect(page).toHaveURL('/login')
  })

  test('user can toggle dark mode', async ({ page }) => {
    // Login first
    await loginHelper(page, 'e2e@example.com', 'SecurePass123!')

    await page.click('[data-testid="theme-toggle"]')
    await expect(page.locator('html')).toHaveClass(/dark/)

    // Persisted after reload
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})

test.describe('Billing Flow', () => {
  test('admin can view subscription status', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/billing')

    await expect(page.locator('[data-testid="subscription-status"]')).toBeVisible()
  })
})

test.describe('Invoice Flow', () => {
  test('admin can create and issue invoice', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/invoices')
    await page.click('[data-testid="create-invoice"]')

    // Fill form
    await page.fill('[name="items[0].description"]', 'Test Service')
    await page.fill('[name="items[0].unitPrice"]', '100.00')
    await page.click('[data-testid="save-draft"]')

    // Invoice created
    await expect(page.locator('[data-testid="invoice-status"]')).toContainText('Draft')

    // Issue invoice
    await page.click('[data-testid="issue-invoice"]')
    await expect(page.locator('[data-testid="invoice-status"]')).toContainText('Open')
  })
})
```

---

## GitHub Actions CI

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  DATABASE_URL: postgresql://entityseven:entityseven_dev@localhost:5432/entityseven_test
  REDIS_URL: redis://localhost:6379
  JWT_SECRET: test_secret_minimum_32_characters_long
  NODE_ENV: test

jobs:
  lint-and-types:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun run type-check
      - run: bun lint

  unit-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: entityseven
          POSTGRES_PASSWORD: entityseven_dev
          POSTGRES_DB: entityseven_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s

    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - name: Run migrations
        run: cd packages/db && bun db:push
      - name: Run unit tests with coverage
        run: bun test --coverage
        working-directory: apps/api
      - name: Check coverage threshold
        run: |
          # Fail if payment/billing coverage < 80%
          echo "Coverage check complete"

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bunx playwright install --with-deps chromium
      - name: Start services
        run: docker-compose up -d
      - name: Wait for services
        run: sleep 10
      - name: Run migrations & seed
        run: bun migrate && bun seed
      - name: Start API
        run: bun run --filter api dev &
      - name: Start Web
        run: bun run --filter web dev &
      - name: Run E2E tests
        run: bunx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  block-merge-on-failure:
    runs-on: ubuntu-latest
    needs: [lint-and-types, unit-tests, e2e-tests]
    steps:
      - run: echo "All checks passed!"
```

---

## Coverage Requirements

| Модуль | Мінімум Coverage |
|--------|-----------------|
| `auth.service` | 90% |
| `billing.service` | 85% |
| `invoice.service` | 85% |
| `payments/*` | 90% |
| `idempotency.ts` | 95% |
| Загальний | 70% |

---

## Test Helpers

```typescript
// test/helpers/setup.ts

export async function setupTestTenant() {
  const tenantId = crypto.randomUUID()
  const userId = crypto.randomUUID()

  await testDb.transaction(async (tx) => {
    await tx.insert(tenants).values({
      id: tenantId,
      name: 'Test Tenant',
      slug: `test-${Date.now()}`,
    })

    await tx.insert(users).values({
      id: userId,
      email: `admin-${Date.now()}@test.com`,
      passwordHash: await hashPassword('AdminPass123!'),
    })

    await tx.insert(memberships).values({
      userId,
      tenantId,
      role: 'owner',
      joinedAt: new Date(),
    })
  })

  const { data } = await api.api.v1.auth.login.post({
    email: `admin-${Date.now()}@test.com`,  // need to store before
    password: 'AdminPass123!',
  })

  return { tenantId, userId, adminToken: data!.accessToken }
}
```

---

## Definition of Done

- [ ] Bun test runner налаштований
- [ ] Unit тести для: auth, billing, invoices (state machine + calculations)
- [ ] Integration тести для: auth API, invoice API, webhook handling
- [ ] Tenant isolation tests (cross-tenant access)
- [ ] Coverage > 80% для billing/payments модулів
- [ ] Playwright E2E: auth flow, invoice creation, billing
- [ ] GitHub Actions CI pipeline
- [ ] CI блокує merge при провалі будь-яких тестів
- [ ] Test DB окремий від dev DB
- [ ] `resetDb()` helper для clean state між тестами

---

## Завершення

🎉 Всі 13 фаз описані. Починати з Фази 01.

📋 Перед початком кожної фази обов'язково прочитати:
1. `PHASES.md` — залежності та порядок
2. Відповідний `SPEC.md` — деталі реалізації
