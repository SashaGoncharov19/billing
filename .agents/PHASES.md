# Entity Seven — Фази розробки (PHASES)

Цей файл визначає порядок виконання фаз, залежності та критерії завершення кожної фази.

---

## Правило залежностей

Фазу **не можна починати** без завершення всіх фаз, від яких вона залежить.
Кожна фаза має чіткий **Definition of Done (DoD)**.

---

## Фаза 01 — Project Setup & Monorepo

**Залежності:** Немає (стартова точка)
**Оцінка:** ~4 год

### Що робиться
- Ініціалізація monorepo (Bun workspaces)
- Структура `apps/api`, `apps/web`, `packages/db`, `packages/shared`
- Налаштування TypeScript strict mode у всіх пакетах
- Налаштування ESLint + Prettier
- Docker Compose (PostgreSQL, Redis)
- `.env.example` з усіма змінними
- Базовий `Makefile` або `scripts/` для dev workflow

### Definition of Done
- [ ] `bun install` без помилок
- [ ] `docker-compose up` піднімає PostgreSQL та Redis
- [ ] `bun dev` стартує API та web одночасно
- [ ] TypeScript компілюється без помилок
- [ ] ESLint та Prettier проходять без помилок

---

## Фаза 02 — Database Schema & Migrations

**Залежності:** Фаза 01
**Оцінка:** ~6 год

### Що робиться
- `packages/db` — Drizzle ORM налаштування
- Всі таблиці: users, tenants, memberships, invoices, payments, subscriptions, products, audit_logs, idempotency_keys
- Індекси та foreign keys
- Seed скрипти для розробки
- Міграції через `drizzle-kit`

### Definition of Done
- [ ] Всі таблиці задокументовані та реалізовані
- [ ] `drizzle-kit push` виконується без помилок
- [ ] Seed скрипт наповнює БД тестовими даними
- [ ] Types/schemas експортуються з `packages/db`

---

## Фаза 03 — Authentication & Authorization

**Залежності:** Фаза 01, 02
**Оцінка:** ~8 год

### Що робиться
- JWT access tokens (short-lived, 15min)
- Refresh tokens (httpOnly cookie, 7 days)
- RBAC: roles (admin, member) + permissions table
- Middleware для перевірки auth
- Ендпоінти: register, login, logout, refresh, me
- Password hashing (bcrypt/argon2)
- Rate limiting на auth ендпоінтах

### Definition of Done
- [ ] Register/Login повертає JWT + refresh token
- [ ] Refresh endpoint оновлює access token
- [ ] Захищені роути повертають 401 без токена
- [ ] RBAC middleware блокує неавторизовані дії
- [ ] Unit тести для auth сервісу
- [ ] Integration тести для auth ендпоінтів

---

## Фаза 04 — Multi-Tenant System

**Залежності:** Фаза 02, 03
**Оцінка:** ~6 год

### Що робиться
- Tenant middleware (витягує tenant_id з JWT/session)
- Tenant resolver (по домену або заголовку)
- Tenant ізоляція: всі запити до БД скоупляться
- CRUD для tenants
- Membership management
- Tenant-specific branding (logo, colors)

### Definition of Done
- [ ] Кожен запит до БД має `tenant_id` фільтр
- [ ] Cross-tenant витік даних неможливий (тести)
- [ ] Tenant resolver коректно резолвить по JWT
- [ ] Membership invite flow працює

---

## Фаза 05 — Billing Abstraction

**Залежності:** Фаза 02, 03, 04
**Оцінка:** ~10 год

### Що робиться
- `PaymentProvider` interface
- Stripe implementation (перший провайдер)
- Checkout session flow
- Subscription management (create, cancel, update)
- Webhook обробка (з verificationою підпису)
- Idempotency keys для всіх операцій
- Зберігання provider IDs в БД

### Definition of Done
- [ ] Stripe checkout session створюється
- [ ] Webhook змінює статус підписки в БД
- [ ] Повторний webhook ігнорується (idempotent)
- [ ] Транзакції атомарні (rollback при помилці)
- [ ] Integration тести з mock Stripe

---

## Фаза 06 — Invoices & PDF

**Залежності:** Фаза 04, 05
**Оцінка:** ~8 год

### Що робиться
- Invoice CRUD (draft → open → paid → void)
- Sequential invoice numbering per tenant
- Line items з підтримкою VAT
- PDF генерація через Puppeteer
- Зберігання PDF в S3/R2
- Signed URL для доступу до PDF
- BullMQ job для PDF генерації

### Definition of Done
- [ ] Invoice створюється з коректним номером
- [ ] PDF генерується та зберігається в S3
- [ ] Signed URL валідний та доступний
- [ ] Invoice status transitions коректні
- [ ] Multi-currency підтримка

---

## Фаза 07 — Tickets System

**Залежності:** Фаза 03, 04
**Оцінка:** ~6 год

### Що робиться
- Tickets CRUD (open, in_progress, resolved, closed)
- Пріоритети (low, medium, high, critical)
- Коментарі до тікетів
- File attachments (S3/R2)
- Призначення на агентів (admin users)
- Email notifications через queue

### Definition of Done
- [ ] Тікет може бути створений клієнтом
- [ ] Admin може переглядати всі тікети тенанта
- [ ] Status transitions логічні та захищені
- [ ] Notification відправляється при зміні статусу

---

## Фаза 08 — REST API Layer

**Залежності:** Фаза 03, 04, 05, 06, 07
**Оцінка:** ~6 год

### Що робиться
- ElysiaJS роутинг з версіонуванням `/api/v1`
- Consistent error format
- `request_id` в кожному response
- Cursor-based pagination
- Input validation (zod)
- CORS налаштування
- Admin namespace `/api/admin`
- Rate limiting глобально

### Definition of Done
- [ ] Всі ендпоінти задокументовані (OpenAPI)
- [ ] Error format консистентний
- [ ] Pagination працює коректно
- [ ] Rate limiting блокує abuse

---

## Фаза 09 — Frontend (Next.js)

**Залежності:** Фаза 08
**Оцінка:** ~20 год

### Що робиться
- Next.js App Router
- Design system (Tailwind + shadcn/ui)
- Light/Dark theme з persisted preference
- i18n (мінімум 2 мови: EN + UK)
- Сторінки: Dashboard, Billing, Invoices, Tickets, Services, Settings
- Auth flow (login, register, logout)
- Tenant branding (logo, кольори)
- Responsive/mobile-first

### Definition of Done
- [ ] Всі сторінки рендеряться без помилок
- [ ] Auth flow повністю функціональний
- [ ] Темна/світла тема переключається та зберігається
- [ ] i18n працює для всіх ключів
- [ ] Mobile responsive

---

## Фаза 10 — Admin Panel

**Залежності:** Фаза 09
**Оцінка:** ~12 год

### Що робиться
- Окремий розділ `/admin` у фронтенді
- Управління тенантами
- Управління користувачами
- Перегляд інвойсів та платежів
- Audit log viewer
- Plugin management UI
- Stricter authorization (admin role)

### Definition of Done
- [ ] Admin-only роути недоступні для звичайних користувачів
- [ ] Всі admin дії записуються в audit log
- [ ] Tenant management повністю функціональний

---

## Фаза 11 — Queue System (BullMQ)

**Залежності:** Фаза 01 (Redis)
**Використовується:** Фаза 05, 06, 07
**Оцінка:** ~4 год

### Що робиться
- BullMQ workers налаштування
- Job types: email, pdf-generation, webhook-processing
- Exponential backoff
- Dead-letter queue
- Job monitoring (Bull Board)
- Idempotent jobs

### Definition of Done
- [ ] Всі job types реалізовані
- [ ] Failed jobs потрапляють в DLQ
- [ ] Retry logic з exponential backoff
- [ ] Bull Board доступний в dev

---

## Фаза 12 — Observability

**Залежності:** Фаза 01
**Оцінка:** ~4 год

### Що робиться
- Structured JSON logging
- `request_id` propagation
- `/health` endpoint
- Error tracking (Sentry або self-hosted)
- Метрики (latency, error rate)
- Log levels (debug, info, warn, error)

### Definition of Done
- [ ] Всі requests логуються з `request_id`
- [ ] `/health` повертає статус сервісів (DB, Redis)
- [ ] Помилки трекаються та алертяться

---

## Фаза 13 — Testing & CI

**Залежності:** Фаза 12 (остання)
**Оцінка:** ~8 год

### Що робиться
- Unit тести для всіх сервісів
- Integration тести (DB + API)
- E2E тести (auth, billing, invoices)
- GitHub Actions CI pipeline
- CI блокує merge при провалі тестів
- Coverage report

### Definition of Done
- [ ] Unit тести: >80% coverage на payments/billing
- [ ] Integration тести проходять на test DB
- [ ] E2E тести: auth flow + basic billing
- [ ] CI pipeline зелений

---

## Загальна послідовність (рекомендована)

```
01 → 02 → 03 → 04 → 05 → 06 → 07
                              ↓
                    08 → 09 → 10
                    ↑
              11 (паралельно з 05+)
              12 (паралельно з 01+)
              13 (фінал)
```
