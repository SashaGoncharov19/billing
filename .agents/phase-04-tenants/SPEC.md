# Фаза 04 — Multi-Tenant System

## Мета фази

Реалізувати повну мульти-тенант ізоляцію: резолвінг тенанта, middleware для скоупінгу запитів, CRUD для тенантів та membership management.

---

## Залежності

- ✅ Фаза 02 (таблиці tenants, memberships)
- ✅ Фаза 03 (auth middleware — tenant_id в JWT)

---

## Ключовий принцип

> **КОЖЕН запит до БД в контексті тенанта ОБОВ'ЯЗКОВО має містити `WHERE tenant_id = ?`**
> Порушення цього правила = critical security bug

---

## Структура модуля

```
src/
├── modules/
│   └── tenants/
│       ├── tenant.router.ts
│       ├── tenant.service.ts
│       ├── tenant.schema.ts
│       └── tenant.test.ts
│
├── middleware/
│   └── tenant.ts              ← tenant resolver middleware
│
└── lib/
    └── tenant-context.ts      ← утиліта для tenant-scoped queries
```

---

## Tenant Resolver Middleware

Тenant ID береться з JWT payload (встановлюється при login).

При login користувач вибирає або автоматично отримує перший доступний tenant.

```typescript
// middleware/tenant.ts
import { Elysia } from 'elysia'
import { authenticate } from './authenticate'
import { db } from '@entityseven/db'
import { tenants } from '@entityseven/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export const resolveTenant = new Elysia({ name: 'resolve-tenant' })
  .use(authenticate)
  .derive({ as: 'scoped' }, async ({ user, error }) => {
    const tenant = await db.query.tenants.findFirst({
      where: and(
        eq(tenants.id, user.tenantId),
        isNull(tenants.deletedAt)
      )
    })

    if (!tenant) {
      return error(404, { code: 'TENANT_NOT_FOUND', message: 'Tenant not found or inactive' })
    }

    return { tenant }
  })
```

---

## Tenant-Scoped Query Утиліта

```typescript
// lib/tenant-context.ts
import { db } from '@entityseven/db'

/**
 * Wrapper що гарантує tenant_id в кожному запиті.
 * Використовувати ЗАМІСТЬ прямого db в бізнес-логіці.
 */
export function tenantDb(tenantId: string) {
  return {
    /** Гарантує що будь-який запит використовує tenantId */
    assertTenantId: () => tenantId,

    // Helper для where clause
    where: <T extends { tenantId: string }>(conditions: T) => ({
      ...conditions,
      tenantId,
    }),
  }
}
```

---

## API Ендпоінти

### `POST /api/v1/tenants`

**Auth:** admin або owner

**Запит:**
```json
{
  "name": "Acme Corp",
  "slug": "acme-corp"
}
```

**Дії:**
1. Перевірити унікальність slug
2. Створити tenant в транзакції
3. Додати поточного user як owner в memberships
4. Audit log: `tenant.created`

**Відповідь (201):** Tenant object

---

### `GET /api/v1/tenants/current`

**Auth:** authenticated (будь-який член)

**Відповідь:**
```json
{
  "id": "uuid",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "logoUrl": null,
  "primaryColor": "#3B82F6",
  "secondaryColor": "#1E40AF",
  "plan": "pro"
}
```

---

### `PATCH /api/v1/tenants/current`

**Auth:** admin або owner

**Запит (часткове оновлення):**
```json
{
  "name": "Acme Corp Ltd",
  "primaryColor": "#FF5733",
  "secondaryColor": "#C70039"
}
```

**Дії:**
1. Валідація кольорів: HEX формат (#RRGGBB)
2. Оновлення лише дозволених полів
3. Audit log: `tenant.updated`

---

### `POST /api/v1/tenants/current/logo`

**Auth:** admin або owner
**Content-Type:** multipart/form-data

**Дії:**
1. Validate file: mime type (image/png, image/jpeg, image/svg+xml), max 5MB
2. Upload до S3/R2 з key: `tenants/{tenantId}/logo.{ext}`
3. Оновити `logo_url` в БД
4. Audit log: `tenant.logo_updated`

---

### `GET /api/v1/tenants/current/members`

**Auth:** admin або owner

**Відповідь:**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "email": "user@example.com",
      "role": "admin",
      "joinedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### `POST /api/v1/tenants/current/members/invite`

**Auth:** admin або owner

**Запит:**
```json
{
  "email": "newmember@example.com",
  "role": "member"
}
```

**Дії:**
1. Якщо user існує → додати membership одразу
2. Якщо user не існує → відправити invite email (через queue)
3. Audit log: `member.invited`

---

### `PATCH /api/v1/tenants/current/members/:memberId`

**Auth:** owner тільки

**Запит:**
```json
{
  "role": "admin"
}
```

**Обмеження:**
- Не можна знизити роль власного аккаунту (owner)
- Не можна видалити останнього owner

---

### `DELETE /api/v1/tenants/current/members/:memberId`

**Auth:** owner або admin (admin може видаляти лише member)

---

## Tenant Switching

Якщо user є членом кількох тенантів, при login треба вибрати tenant.

**Ендпоінт `POST /api/v1/auth/switch-tenant`:**

```json
// Request
{ "tenantId": "uuid" }

// Response
{
  "accessToken": "new JWT with new tenantId",
  "tenant": { ... }
}
```

**Дії:**
1. Перевірити що user є членом target tenant
2. Видати новий access token з `tenantId` = обраний tenant

---

## Tenant Branding

Кожен tenant може кастомізувати:
- `logoUrl` — посилання на логотип (S3/R2)
- `primaryColor` — основний колір (#RRGGBB)
- `secondaryColor` — другорядний колір
- `customCss` — кастомний CSS для white-label (санітизувати!)

Брендинг передається на фронтенд через `GET /api/v1/tenants/current` і застосовується як CSS variables:

```css
:root {
  --color-primary: #3B82F6;
  --color-secondary: #1E40AF;
}
```

---

## Ізоляція даних — Правила

### ПРАВИЛЬНО ✅
```typescript
// Завжди фільтрувати по tenantId
const invoices = await db.select()
  .from(invoicesTable)
  .where(and(
    eq(invoicesTable.tenantId, tenant.id),  // ← ОБОВ'ЯЗКОВО
    eq(invoicesTable.status, 'open')
  ))
```

### НЕПРАВИЛЬНО ❌
```typescript
// НІКОЛИ так не робити — витік даних між тенантами!
const invoices = await db.select()
  .from(invoicesTable)
  .where(eq(invoicesTable.status, 'open'))  // ← НЕМАЄ tenant_id filter!
```

---

## Тести

```typescript
describe('Tenant Isolation', () => {
  it('user of tenant A cannot see data of tenant B')
  it('tenant middleware returns 404 for invalid tenantId in JWT')
  it('cross-tenant join attempt is blocked')
})

describe('Tenant CRUD', () => {
  it('creates tenant with owner membership')
  it('slug must be unique')
  it('logo upload resizes and stores in S3')
})

describe('Membership Management', () => {
  it('owner can invite member')
  it('cannot remove last owner')
  it('member cannot change roles')
})
```

---

## Definition of Done

- [ ] `resolveTenant` middleware працює — tenant береться з JWT
- [ ] Всі API ендпоінти реалізовані
- [ ] Tenant branding (logo, colors) зберігається
- [ ] Tenant switching видає новий JWT
- [ ] Membership invite flow (для існуючих users)
- [ ] Cross-tenant ізоляція перевірена тестами
- [ ] Audit log для всіх tenant операцій

---

## Наступна фаза

➡️ [Фаза 05 — Billing Abstraction](../phase-05-billing/SPEC.md)
