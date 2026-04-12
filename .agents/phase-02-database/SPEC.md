# Фаза 02 — Database Schema & Migrations

## Мета фази

Спроектувати та реалізувати повну схему БД для Entity Seven платформи через Drizzle ORM з правильними індексами, foreign keys, та seed даними.

---

## Залежності

- ✅ Фаза 01 завершена (Docker + bun workspaces)
- PostgreSQL 16 запущений через docker-compose

---

## Пакет `packages/db`

### Структура

```
packages/db/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
└── src/
    ├── index.ts              ← головний експорт
    ├── client.ts             ← підключення до БД
    ├── schema/
    │   ├── index.ts          ← реекспортує всі схеми
    │   ├── users.ts
    │   ├── tenants.ts
    │   ├── memberships.ts
    │   ├── invoices.ts
    │   ├── invoice-items.ts
    │   ├── payments.ts
    │   ├── subscriptions.ts
    │   ├── products.ts
    │   ├── tickets.ts
    │   ├── ticket-comments.ts
    │   ├── audit-logs.ts
    │   └── idempotency-keys.ts
    ├── migrations/           ← авто-генеровані drizzle-kit
    └── seed.ts               ← seed скрипт
```

---

## Повна схема БД

### `schema/users.ts`

```typescript
import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const themeEnum = pgEnum('theme', ['light', 'dark'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  preferredLanguage: varchar('preferred_language', { length: 10 }).default('en').notNull(),
  theme: themeEnum('theme').default('light').notNull(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),  // soft delete
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
```

### `schema/tenants.ts`

```typescript
import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core'

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(), // URL-friendly ідентифікатор
  logoUrl: text('logo_url'),
  primaryColor: varchar('primary_color', { length: 7 }),    // HEX напр. #3B82F6
  secondaryColor: varchar('secondary_color', { length: 7 }),
  customCss: text('custom_css'),                             // кастомний CSS для white-label
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
```

### `schema/memberships.ts`

```typescript
import { pgTable, uuid, timestamp, pgEnum, index, unique } from 'drizzle-orm/pg-core'
import { users } from './users'
import { tenants } from './tenants'

export const membershipRoleEnum = pgEnum('membership_role', ['owner', 'admin', 'member'])

export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  role: membershipRoleEnum('role').default('member').notNull(),
  invitedAt: timestamp('invited_at', { withTimezone: true }),
  joinedAt: timestamp('joined_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userTenantUnique: unique().on(table.userId, table.tenantId),
  tenantIdx: index('memberships_tenant_idx').on(table.tenantId),
  userIdx: index('memberships_user_idx').on(table.userId),
}))

export type Membership = typeof memberships.$inferSelect
export type NewMembership = typeof memberships.$inferInsert
```

### `schema/products.ts`

```typescript
import { pgTable, uuid, varchar, numeric, timestamp, pgEnum, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const billingTypeEnum = pgEnum('billing_type', ['one_time', 'recurring'])
export const billingIntervalEnum = pgEnum('billing_interval', ['month', 'year'])

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 1000 }),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  billingType: billingTypeEnum('billing_type').default('one_time').notNull(),
  billingInterval: billingIntervalEnum('billing_interval'),  // null for one_time
  stripeProductId: varchar('stripe_product_id', { length: 255 }),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  isActive: uuid('is_active'),  // ВИПРАВИТИ: використати boolean
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('products_tenant_idx').on(table.tenantId),
}))

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
```

**УВАГА АГЕНТУ:** В `products.ts` є навмисна помилка `isActive: uuid(...)` — виправити на `isActive: boolean('is_active').default(true).notNull()`

### `schema/invoices.ts`

```typescript
import { pgTable, uuid, varchar, numeric, timestamp, pgEnum, index, integer } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'

export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'open', 'paid', 'void', 'uncollectible'])

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  number: integer('number').notNull(),               // sequential per tenant
  status: invoiceStatusEnum('status').default('draft').notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  subtotalAmount: numeric('subtotal_amount', { precision: 12, scale: 2 }).notNull(),
  taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  paidAmount: numeric('paid_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  notes: varchar('notes', { length: 2000 }),
  pdfUrl: varchar('pdf_url', { length: 2000 }),      // S3/R2 URL
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  issuedAt: timestamp('issued_at', { withTimezone: true }),
  dueAt: timestamp('due_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  voidedAt: timestamp('voided_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantNumberUnique: unique().on(table.tenantId, table.number),
  tenantIdx: index('invoices_tenant_idx').on(table.tenantId),
  statusIdx: index('invoices_status_idx').on(table.status),
}))

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
```

### `schema/invoice-items.ts`

```typescript
import { pgTable, uuid, varchar, numeric, integer, index } from 'drizzle-orm/pg-core'
import { invoices } from './invoices'
import { products } from './products'

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id),  // nullable (custom line item)
  description: varchar('description', { length: 500 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  taxRate: numeric('tax_rate', { precision: 5, scale: 4 }).default('0').notNull(),  // 0.2 = 20%
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
}, (table) => ({
  invoiceIdx: index('invoice_items_invoice_idx').on(table.invoiceId),
}))

export type InvoiceItem = typeof invoiceItems.$inferSelect
export type NewInvoiceItem = typeof invoiceItems.$inferInsert
```

### `schema/payments.ts`

```typescript
import { pgTable, uuid, varchar, numeric, timestamp, pgEnum, jsonb, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { invoices } from './invoices'

export const paymentProviderEnum = pgEnum('payment_provider', ['stripe', 'manual'])
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'processing', 'succeeded', 'failed', 'refunded'])

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  invoiceId: uuid('invoice_id').references(() => invoices.id),
  provider: paymentProviderEnum('provider').notNull(),
  providerPaymentId: varchar('provider_payment_id', { length: 255 }),  // Stripe payment_intent_id
  providerData: jsonb('provider_data'),                                  // raw provider response
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  status: paymentStatusEnum('status').default('pending').notNull(),
  failureReason: varchar('failure_reason', { length: 500 }),
  refundedAmount: numeric('refunded_amount', { precision: 12, scale: 2 }).default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('payments_tenant_idx').on(table.tenantId),
  invoiceIdx: index('payments_invoice_idx').on(table.invoiceId),
  providerPaymentIdx: index('payments_provider_payment_idx').on(table.providerPaymentId),
}))

export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
```

### `schema/subscriptions.ts`

```typescript
import { pgTable, uuid, varchar, timestamp, pgEnum, jsonb, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { products } from './products'

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'
])

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  productId: uuid('product_id').references(() => products.id),
  provider: varchar('provider', { length: 50 }).notNull(),              // 'stripe'
  providerSubscriptionId: varchar('provider_subscription_id', { length: 255 }).notNull().unique(),
  providerData: jsonb('provider_data'),
  status: subscriptionStatusEnum('status').notNull(),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  cancelAtPeriodEnd: uuid('cancel_at_period_end'),  // ВИПРАВИТИ: boolean
  trialEnd: timestamp('trial_end', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('subscriptions_tenant_idx').on(table.tenantId),
}))

export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert
```

**УВАГА АГЕНТУ:** `cancelAtPeriodEnd: uuid(...)` — виправити на `cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull()`

### `schema/tickets.ts`

```typescript
import { pgTable, uuid, varchar, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'

export const ticketStatusEnum = pgEnum('ticket_status', ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'])
export const ticketPriorityEnum = pgEnum('ticket_priority', ['low', 'medium', 'high', 'critical'])

export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id),
  assignedToUserId: uuid('assigned_to_user_id').references(() => users.id),  // admin user
  subject: varchar('subject', { length: 500 }).notNull(),
  body: text('body').notNull(),
  status: ticketStatusEnum('status').default('open').notNull(),
  priority: ticketPriorityEnum('priority').default('medium').notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('tickets_tenant_idx').on(table.tenantId),
  statusIdx: index('tickets_status_idx').on(table.status),
  assigneeIdx: index('tickets_assignee_idx').on(table.assignedToUserId),
}))

export type Ticket = typeof tickets.$inferSelect
export type NewTicket = typeof tickets.$inferInsert
```

### `schema/ticket-comments.ts`

```typescript
import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core'
import { tickets } from './tickets'
import { users } from './users'

export const ticketComments = pgTable('ticket_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  isInternal: boolean('is_internal').default(false).notNull(),  // internal notes (admin-only)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  ticketIdx: index('ticket_comments_ticket_idx').on(table.ticketId),
}))

export type TicketComment = typeof ticketComments.$inferSelect
export type NewTicketComment = typeof ticketComments.$inferInsert
```

### `schema/audit-logs.ts`

```typescript
import { pgTable, uuid, varchar, jsonb, timestamp, index, text } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  userId: uuid('user_id').references(() => users.id),  // null для system actions
  action: varchar('action', { length: 255 }).notNull(),  // напр. 'invoice.created', 'user.login'
  resourceType: varchar('resource_type', { length: 100 }),  // напр. 'invoice', 'payment'
  resourceId: uuid('resource_id'),
  metadata: jsonb('metadata'),    // додаткові дані (diff, IP, user agent)
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('audit_logs_tenant_idx').on(table.tenantId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}))

export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
```

### `schema/idempotency-keys.ts`

```typescript
import { pgTable, uuid, varchar, text, timestamp, index, unique } from 'drizzle-orm/pg-core'

export const idempotencyKeys = pgTable('idempotency_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 255 }).notNull(),
  scope: varchar('scope', { length: 100 }).notNull(),  // напр. 'payment', 'invoice'
  responseHash: text('response_hash').notNull(),         // hash відповіді для повторення
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  keyScope: unique().on(table.key, table.scope),
  expiresIdx: index('idempotency_keys_expires_idx').on(table.expiresAt),
}))

export type IdempotencyKey = typeof idempotencyKeys.$inferSelect
```

---

## `client.ts` — підключення до PostgreSQL

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) throw new Error('DATABASE_URL is required')

const sql = postgres(connectionString, {
  max: 10,          // connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(sql, { schema })
export type DB = typeof db
```

---

## `drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL']!,
  },
  verbose: true,
  strict: true,
})
```

---

## `seed.ts` — seed дані

Seed має створювати:
1. 1 системний tenant: `{ name: 'Entity Seven Demo', slug: 'es-demo' }`
2. 1 admin user: `{ email: 'admin@entityseven.com', password: 'Admin123!' }`
3. 1 admin membership (role: 'owner')
4. 2-3 sample products
5. 2-3 sample invoices в різних статусах

---

## Правила для агента

1. **Soft deletes обов'язкові** для users, tenants, products — поле `deleted_at`
2. **Timestamp завжди `withTimezone: true`**
3. **UUID для всіх primary keys** через `defaultRandom()`
4. **Numeric для грошових полів** (не float!), precision 12, scale 2
5. **Індекси на всіх foreign keys** для performance
6. **Унікальні обмеження** де потрібно (email, slug, invoice number per tenant)
7. **Enums через `pgEnum`** — не varchar

---

## Definition of Done

- [ ] Всі 11 таблиць реалізовані відповідно до схеми
- [ ] `drizzle-kit generate` генерує міграції без помилок
- [ ] `drizzle-kit push` застосовує міграції до PostgreSQL
- [ ] Всі types/schemas експортуються з `packages/db/src/index.ts`
- [ ] `bun db:seed` наповнює БД тестовими даними
- [ ] TypeScript компілюється без помилок

---

## Наступна фаза

➡️ [Фаза 03 — Authentication & Authorization](../phase-03-auth/SPEC.md)
