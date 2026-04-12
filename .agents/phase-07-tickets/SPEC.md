# Фаза 07 — Tickets System

## Мета фази

Побудувати систему підтримки клієнтів: створення тікетів, коментарі, призначення на агентів, email сповіщення.

---

## Залежності

- ✅ Фаза 02 (таблиці: tickets, ticket_comments)
- ✅ Фаза 03 (auth)
- ✅ Фаза 04 (tenant context)
- ✅ Фаза 11 частково (BullMQ для email notifications)

---

## Структура модуля

```
src/
├── modules/
│   └── tickets/
│       ├── ticket.router.ts
│       ├── ticket.service.ts
│       ├── ticket.schema.ts
│       ├── ticket.types.ts
│       └── ticket.test.ts
```

---

## Ticket State Machine

```
open → in_progress → waiting_customer → resolved → closed
  ↓                                       ↑
  └──────────────────────────────────────┘ (reopen)
```

**Переходи:**
- `open → in_progress`: admin призначає тікет
- `in_progress → waiting_customer`: admin очікує відповіді
- `waiting_customer → in_progress`: клієнт додав коментар
- `in_progress → resolved`: admin вирішив
- `resolved → closed`: автоматично через 7 днів або manual
- `resolved → in_progress`: клієнт "reopened" (додав коментар)
- `closed → open`: тільки admin може реоткрити

---

## Roles та дозволи

| Дія | Member | Admin/Owner |
|-----|--------|-------------|
| Створити тікет | ✅ | ✅ |
| Переглядати свої тікети | ✅ | ✅ |
| Переглядати всі тікети тенанта | ❌ | ✅ |
| Коментувати | ✅ | ✅ |
| Внутрішні нотатки | ❌ | ✅ |
| Призначати агента | ❌ | ✅ |
| Змінювати пріоритет | ❌ | ✅ |
| Закривати/вирішувати | ❌ | ✅ |

---

## API Ендпоінти

### `POST /api/v1/tickets`

**Auth:** authenticated member

**Запит:**
```json
{
  "subject": "Cannot access my invoices",
  "body": "When I click on Invoices tab, I get an error...",
  "priority": "high"
}
```

**Дії:**
1. Створити ticket з `status: 'open'`, `createdByUserId = user.id`
2. Audit log: `ticket.created`
3. Enqueue email notification до admin (через BullMQ)

**Відповідь (201):**
```json
{
  "id": "uuid",
  "subject": "Cannot access my invoices",
  "status": "open",
  "priority": "high",
  "createdAt": "2024-01-15T00:00:00Z"
}
```

---

### `GET /api/v1/tickets`

**Auth:** authenticated

- **Для member:** тільки свої тікети (`WHERE created_by_user_id = ?`)
- **Для admin/owner:** всі тікети тенанта

**Query params:**
- `status` — фільтр (open, in_progress, resolved, closed)
- `priority` — фільтр (low, medium, high, critical)
- `assignedToMe` — boolean (для admins)
- `cursor`, `limit`

**Відповідь:**
```json
{
  "data": [
    {
      "id": "uuid",
      "subject": "...",
      "status": "open",
      "priority": "high",
      "createdBy": { "id": "uuid", "email": "user@example.com" },
      "assignedTo": null,
      "commentCount": 3,
      "lastActivityAt": "2024-01-16T10:00:00Z",
      "createdAt": "2024-01-15T00:00:00Z"
    }
  ],
  "nextCursor": "...",
  "hasMore": false
}
```

---

### `GET /api/v1/tickets/:id`

Повний тікет з коментарями.

**Auth:** member — лише свій, admin — будь-який в тенанті

```json
{
  "id": "uuid",
  "subject": "...",
  "body": "...",
  "status": "in_progress",
  "priority": "high",
  "createdBy": { "id": "uuid", "email": "..." },
  "assignedTo": { "id": "uuid", "email": "admin@example.com" },
  "comments": [
    {
      "id": "uuid",
      "body": "We are looking into this...",
      "isInternal": false,
      "author": { "id": "uuid", "email": "admin@example.com" },
      "createdAt": "2024-01-15T12:00:00Z"
    }
  ],
  "createdAt": "2024-01-15T00:00:00Z",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

**Важливо для member:** `isInternal: true` коментарі НЕ повертати!

---

### `PATCH /api/v1/tickets/:id`

**Auth:** admin

Оновлення:
```json
{
  "status": "in_progress",
  "priority": "critical",
  "assignedToUserId": "uuid"
}
```

**Дії:**
1. Validate status transition
2. Якщо status змінився → audit log + email notification
3. Якщо призначений агент → email notification агенту

---

### `POST /api/v1/tickets/:id/comments`

**Auth:** authenticated

**Запит:**
```json
{
  "body": "The issue still persists after clearing cache",
  "isInternal": false   // admin може true
}
```

**Дії:**
1. Якщо member коментує → `isInternal` завжди `false` (ignore якщо true)
2. Зберегти коментар
3. Оновити `updated_at` тікету
4. Якщо member коментує і статус `waiting_customer` → auto-transition до `in_progress`
5. Enqueue email notification

---

### `GET /api/v1/tickets/:id/comments`

Для member — без internal comments.
Для admin — всі comments.

---

## Email Notifications

Через BullMQ queue `emails`:

### Нові тікети (до admin):
```
Subject: [New Ticket #123] Cannot access my invoices
Body: A new support ticket has been created by {user}...
```

### Оновлення статусу (до клієнта):
```
Subject: [Ticket #123 Updated] Status changed to: In Progress
Body: Your ticket has been updated by our team...
```

### Призначення агенту:
```
Subject: [Ticket #123] Assigned to you
Body: A ticket has been assigned to you...
```

---

## Тести

```typescript
describe('Ticket Service', () => {
  describe('createTicket', () => {
    it('creates with correct tenant_id from middleware')
    it('sends email notification to admins')
    it('member cannot set critical priority (future rule)')
  })

  describe('access control', () => {
    it('member can only see their own tickets')
    it('admin can see all tenant tickets')
    it('member cannot see internal comments')
    it('member cannot set isInternal = true on comment')
  })

  describe('state machine', () => {
    it('member comment on waiting_customer ticket → auto transitions to in_progress')
    it('cannot close already closed ticket')
    it('resolved ticket auto-closes after 7 days')  // Queue job
  })
})
```

---

## Auto-Close Job (BullMQ)

Додати recurring job (cron: щоденно) для автоматичного закриття resolved тікетів:

```typescript
// Queue: 'ticket-auto-close'
// Cron: '0 2 * * *'  (щодня о 02:00)

async function autoCloseResolvedTickets() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)  // 7 днів тому

  await db.update(tickets)
    .set({ status: 'closed', closedAt: new Date() })
    .where(and(
      eq(tickets.status, 'resolved'),
      lt(tickets.resolvedAt, cutoff)
    ))
}
```

---

## Definition of Done

- [ ] Ticket CRUD з state machine
- [ ] Role-based access (member / admin)
- [ ] Internal comments (admin-only)
- [ ] Comment auto-transitions статус
- [ ] Email notifications через BullMQ
- [ ] Auto-close job для resolved тікетів (7 днів)
- [ ] Member не бачить internal comments
- [ ] Unit тести для state machine та access control
- [ ] Integration тести для API ендпоінтів

---

## Наступна фаза

➡️ [Фаза 08 — REST API Layer](../phase-08-api/SPEC.md)
