# Фаза 05 — Billing Abstraction & Stripe Integration

## Мета фази

Побудувати provider-agnostic білінгову систему з першою реалізацією через Stripe. Всі грошові операції через абстрактний інтерфейс, ніякого прямого Stripe у бізнес-логіці.

---

## Залежності

- ✅ Фаза 02 (таблиці: payments, subscriptions, products, idempotency_keys)
- ✅ Фаза 03 (auth)
- ✅ Фаза 04 (tenant context)
- ✅ Фаза 11 частково (BullMQ потрібен для webhook processing)

---

## Структура модуля

```
src/
├── modules/
│   └── billing/
│       ├── billing.router.ts
│       ├── billing.service.ts
│       ├── billing.schema.ts
│       ├── billing.types.ts
│       └── billing.test.ts
│
├── providers/
│   ├── payment-provider.interface.ts    ← абстрактний інтерфейс
│   ├── stripe/
│   │   ├── stripe.provider.ts           ← Stripe реалізація
│   │   ├── stripe.webhooks.ts           ← webhook event handlers
│   │   └── stripe.types.ts
│   └── provider.factory.ts             ← вибір провайдера по config
│
└── lib/
    └── idempotency.ts                   ← idempotency key middleware
```

---

## Payment Provider Interface (КРИТИЧНО)

```typescript
// providers/payment-provider.interface.ts

export interface CreateCustomerData {
  tenantId: string
  email: string
  name: string
  metadata?: Record<string, string>
}

export interface CreateCheckoutSessionData {
  tenantId: string
  customerId: string
  priceId: string           // Stripe Price ID або internal product ID
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
  mode: 'payment' | 'subscription'
  quantity?: number
}

export interface CreateSubscriptionData {
  tenantId: string
  customerId: string
  priceId: string
  trialDays?: number
  metadata?: Record<string, string>
}

export interface WebhookPayload {
  rawBody: string | Buffer
  signature: string
}

export interface PaymentProvider {
  // Customer management
  createCustomer(data: CreateCustomerData): Promise<string>  // returns providerId
  updateCustomer(customerId: string, data: Partial<CreateCustomerData>): Promise<void>

  // Checkout
  createCheckoutSession(data: CreateCheckoutSessionData): Promise<{
    sessionId: string
    url: string
  }>

  // Subscriptions
  createSubscription(data: CreateSubscriptionData): Promise<{
    subscriptionId: string
    status: string
    currentPeriodEnd: Date
  }>
  cancelSubscription(subscriptionId: string, atPeriodEnd?: boolean): Promise<void>
  updateSubscription(subscriptionId: string, priceId: string): Promise<void>
  getSubscription(subscriptionId: string): Promise<SubscriptionData>

  // Webhooks
  handleWebhook(payload: WebhookPayload): Promise<WebhookEvent>
  verifyWebhook(payload: WebhookPayload): boolean

  // Payment methods
  createPortalSession(customerId: string, returnUrl: string): Promise<string>
}

export interface WebhookEvent {
  type: 'checkout.completed' | 'payment.succeeded' | 'payment.failed' |
        'subscription.created' | 'subscription.updated' | 'subscription.canceled' |
        'invoice.paid' | 'invoice.payment_failed'
  data: Record<string, unknown>
  providerId: string    // Stripe event ID
}
```

---

## Stripe Provider Implementation

```typescript
// providers/stripe/stripe.provider.ts
import Stripe from 'stripe'
import type { PaymentProvider, WebhookPayload, WebhookEvent } from '../payment-provider.interface'

export class StripeProvider implements PaymentProvider {
  private stripe: Stripe

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-01-27.acacia',
      typescript: true,
    })
  }

  async createCustomer(data: CreateCustomerData): Promise<string> {
    const customer = await this.stripe.customers.create({
      email: data.email,
      name: data.name,
      metadata: {
        tenantId: data.tenantId,
        ...data.metadata,
      },
    })
    return customer.id
  }

  async createCheckoutSession(data: CreateCheckoutSessionData) {
    const session = await this.stripe.checkout.sessions.create({
      customer: data.customerId,
      mode: data.mode,
      line_items: [{
        price: data.priceId,
        quantity: data.quantity ?? 1,
      }],
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      metadata: {
        tenantId: data.tenantId,
        ...data.metadata,
      },
    })
    return { sessionId: session.id, url: session.url! }
  }

  verifyWebhook(payload: WebhookPayload): boolean {
    try {
      this.stripe.webhooks.constructEvent(
        payload.rawBody,
        payload.signature,
        process.env['STRIPE_WEBHOOK_SECRET']!
      )
      return true
    } catch {
      return false
    }
  }

  async handleWebhook(payload: WebhookPayload): Promise<WebhookEvent> {
    const event = this.stripe.webhooks.constructEvent(
      payload.rawBody,
      payload.signature,
      process.env['STRIPE_WEBHOOK_SECRET']!
    )
    // Map Stripe event types to internal WebhookEvent
    return this.mapStripeEvent(event)
  }

  private mapStripeEvent(event: Stripe.Event): WebhookEvent {
    const typeMapping: Record<string, WebhookEvent['type']> = {
      'checkout.session.completed': 'checkout.completed',
      'payment_intent.succeeded': 'payment.succeeded',
      'payment_intent.payment_failed': 'payment.failed',
      'customer.subscription.created': 'subscription.created',
      'customer.subscription.updated': 'subscription.updated',
      'customer.subscription.deleted': 'subscription.canceled',
      'invoice.paid': 'invoice.paid',
      'invoice.payment_failed': 'invoice.payment_failed',
    }

    return {
      type: typeMapping[event.type] ?? 'unknown' as any,
      data: event.data.object as Record<string, unknown>,
      providerId: event.id,
    }
  }

  // ... решта методів
}
```

---

## Provider Factory

```typescript
// providers/provider.factory.ts
import { StripeProvider } from './stripe/stripe.provider'
import type { PaymentProvider } from './payment-provider.interface'

let instance: PaymentProvider | null = null

export function getPaymentProvider(): PaymentProvider {
  if (instance) return instance

  const provider = process.env['PAYMENT_PROVIDER'] ?? 'stripe'

  switch (provider) {
    case 'stripe':
      instance = new StripeProvider(process.env['STRIPE_SECRET_KEY']!)
      break
    default:
      throw new Error(`Unknown payment provider: ${provider}`)
  }

  return instance
}
```

---

## Idempotency System

```typescript
// lib/idempotency.ts
import { db } from '@entityseven/db'
import { idempotencyKeys } from '@entityseven/db/schema'
import { and, eq, gt } from 'drizzle-orm'
import { createHash } from 'crypto'

export async function withIdempotency<T>(
  key: string,
  scope: string,
  operation: () => Promise<T>
): Promise<T> {
  // 1. Перевірити чи існує ключ
  const existing = await db.query.idempotencyKeys.findFirst({
    where: and(
      eq(idempotencyKeys.key, key),
      eq(idempotencyKeys.scope, scope),
      gt(idempotencyKeys.expiresAt, new Date())
    )
  })

  if (existing) {
    // Повернути збережену відповідь
    return JSON.parse(existing.responseHash) as T
  }

  // 2. Виконати операцію
  const result = await operation()

  // 3. Зберегти результат
  await db.insert(idempotencyKeys).values({
    key,
    scope,
    responseHash: JSON.stringify(result),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),  // 24 год
  })

  return result
}
```

---

## API Ендпоінти

### `POST /api/v1/billing/checkout`

**Auth:** authenticated member

**Запит:**
```json
{
  "productId": "uuid",
  "successUrl": "https://app.example.com/billing/success",
  "cancelUrl": "https://app.example.com/billing/cancel"
}
```

**Дії:**
1. Знайти product (tenant-scoped)
2. Отримати або створити Stripe customer для tenant
3. Створити checkout session через провайдер
4. Повернути URL для redirect

**Відповідь (200):**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

---

### `POST /api/v1/billing/portal`

**Auth:** authenticated member

**Дії:**
1. Отримати Stripe customer ID тенанта
2. Створити Customer Portal session
3. Повернути URL

---

### `GET /api/v1/billing/subscription`

**Auth:** authenticated member

**Відповідь:**
```json
{
  "id": "uuid",
  "status": "active",
  "currentPeriodEnd": "2024-02-01T00:00:00Z",
  "cancelAtPeriodEnd": false,
  "product": {
    "name": "Pro Plan",
    "price": "99.00",
    "currency": "USD"
  }
}
```

---

### `POST /api/v1/webhooks/stripe`

**Auth:** NONE (але перевіряти Stripe webhook signature!)

**Дії:**
1. Прочитати raw body (ВАЖЛИВО: не парсити JSON до верифікації)
2. Verify Stripe signature
3. Перевірити idempotency (Stripe Event ID)
4. Поставити job в BullMQ queue `webhook-processing`
5. Відповісти `{ received: true }` негайно (до обробки!)

**Критично:**
- Webhook handler завжди відповідає 200 OK якщо підпис валідний
- Вся обробка асинхронна через queue
- Retry логіка на боці queue, не Stripe

---

### Webhook Event Handlers (через BullMQ)

```typescript
// providers/stripe/stripe.webhooks.ts

async function handleCheckoutCompleted(event: WebhookEvent, db: DB) {
  // 1. Знайти tenant по metadata.tenantId
  // 2. Оновити або створити subscription запис
  // 3. Оновити статус invoice якщо є
  // 4. Audit log: billing.checkout_completed
}

async function handlePaymentSucceeded(event: WebhookEvent, db: DB) {
  // 1. Знайти payment по providerPaymentId
  // 2. Оновити status → 'succeeded'
  // 3. Оновити invoice paidAmount та status → 'paid' якщо повністю оплачено
  // 4. Тригернути plugin hook: onInvoicePaid
  // 5. Відправити квитанцію email через queue
}

async function handlePaymentFailed(event: WebhookEvent, db: DB) {
  // 1. Оновити payment status → 'failed'
  // 2. Тригернути plugin hook: onPaymentFailed
  // 3. Відправити email про провал оплати
}

async function handleSubscriptionUpdated(event: WebhookEvent, db: DB) {
  // 1. Знайти subscription по providerSubscriptionId
  // 2. Оновити status, currentPeriodEnd, cancelAtPeriodEnd
  // 3. Audit log
}
```

---

## Транзакції

Всі операції що змінюють стан платежів — в транзакції:

```typescript
// ПРАВИЛЬНО ✅
await db.transaction(async (tx) => {
  // Оновити invoice
  await tx.update(invoices).set({ status: 'paid', paidAt: new Date() }).where(...)
  // Оновити payment
  await tx.update(payments).set({ status: 'succeeded' }).where(...)
  // Audit log
  await tx.insert(auditLogs).values({ ... })
})
// Якщо щось впаде — rollback автоматично
```

**ЗАБОРОНЕНО** робити зовнішні API calls всередині транзакції!
- Тобто: спочатку Stripe API call → отримали дані → потім транзакція в БД

---

## Products CRUD

### Ендпоінти:

- `GET /api/v1/products` — список продуктів тенанта
- `POST /api/v1/products` — створити (admin)
- `PATCH /api/v1/products/:id` — оновити (admin)
- `DELETE /api/v1/products/:id` — soft delete (admin)

При створенні recurring продукту → синхронізувати зі Stripe (створити Product + Price об'єкти).

---

## Тести

```typescript
describe('Billing Service', () => {
  describe('createCheckoutSession', () => {
    it('creates session with correct tenant metadata')
    it('creates Stripe customer if not exists')
    it('uses existing customer if tenantId has stripeCustomerId')
  })

  describe('webhook handling', () => {
    it('verifies Stripe signature before processing')
    it('processes checkout.completed event')
    it('ignores duplicate events (idempotent)')
    it('records failed payment and sends notification')
  })

  describe('idempotency', () => {
    it('returns cached result for duplicate key')
    it('expires idempotency key after 24h')
  })
})
```

---

## Безпека (NON-NEGOTIABLE)

1. **Webhook signature verification** перед будь-якою обробкою
2. **Idempotency** для кожного webhook event
3. **Ніякого Stripe SDK** поза providers/ директорією
4. **Транзакції** для всіх грошових операцій
5. **Провайдер IDs** зберігати в БД (для reconciliation)
6. **Ніколи не зберігати** raw card data або CVV

---

## Definition of Done

- [ ] `PaymentProvider` interface реалізований
- [ ] `StripeProvider` реалізує весь interface
- [ ] Checkout session flow працює end-to-end
- [ ] Webhook endpoint верифікує підпис
- [ ] Webhook events обробляються через BullMQ queue
- [ ] Idempotency keys запобігають подвійній обробці
- [ ] DB транзакції для всіх грошових операцій
- [ ] Subscription CRUD (через webhook updates)
- [ ] Integration тести з mock StripeProvider
- [ ] Webhook тести з replay Stripe events

---

## Наступна фаза

➡️ [Фаза 06 — Invoices & PDF](../phase-06-invoices/SPEC.md)
