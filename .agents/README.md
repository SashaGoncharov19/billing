# Entity Seven Billing Platform — Agent Documentation Hub

## Про цей проект

**Entity Seven** — production-grade SaaS B2B платформа для централізованого управління клієнтами: портал, білінг, тікети, сервіси.

Цей каталог містить всю документацію для агентів, які будуть писати код.

---

## Структура документації

```
.agents/
├── README.md                        ← цей файл (навігація)
├── PHASES.md                        ← розбивка на етапи
│
├── phase-01-project-setup/
│   └── SPEC.md                      ← ініціалізація проекту, монорепо, інфра
│
├── phase-02-database/
│   └── SPEC.md                      ← схема БД, Drizzle ORM, міграції
│
├── phase-03-auth/
│   └── SPEC.md                      ← JWT auth, refresh tokens, RBAC
│
├── phase-04-tenants/
│   └── SPEC.md                      ← мульти-тенант модель, міддлвари
│
├── phase-05-billing/
│   └── SPEC.md                      ← абстрактний білінг, Stripe інтеграція
│
├── phase-06-invoices/
│   └── SPEC.md                      ← інвойси, PDF генерація, S3
│
├── phase-07-tickets/
│   └── SPEC.md                      ← система тікетів підтримки
│
├── phase-08-api/
│   └── SPEC.md                      ← REST API, versioning, middleware
│
├── phase-09-frontend/
│   └── SPEC.md                      ← Next.js frontend, design system
│
├── phase-10-admin/
│   └── SPEC.md                      ← адмін панель
│
├── phase-11-queue/
│   └── SPEC.md                      ← BullMQ черги, фонові задачі
│
├── phase-12-observability/
│   └── SPEC.md                      ← логи, трейсинг, метрики, health
│
└── phase-13-testing/
    └── SPEC.md                      ← тестова стратегія, CI
```

---

## Правила для агентів (ОБОВ'ЯЗКОВІ)

1. **Читати SPEC.md перед будь-якою роботою** — жодного коду без повного розуміння специфікації
2. **Дотримуватись tech stack** строго: Bun + ElysiaJS + Drizzle + PostgreSQL + Next.js
3. **TypeScript strict mode** — будь-яке `any` без пояснення заборонено
4. **Multi-tenant by design** — кожен запит до БД має скоупитись по `tenant_id`
5. **Security-first** — JWT, RBAC, валідація вхідних даних (zod) обов'язкові
6. **Тести обов'язкові** — жоден модуль без unit/integration тестів не вважається виконаним
7. **Читати PHASES.md** для розуміння залежностей між фазами

---

## Загальний прогрес

| Фаза | Назва | Статус |
|------|-------|--------|
| 01 | Project Setup & Monorepo | ✅ DONE |
| 02 | Database Schema & Migrations | ✅ DONE |
| 03 | Authentication & Authorization | ✅ DONE |
| 04 | Multi-Tenant System | ✅ DONE |
| 05 | Billing Abstraction | ✅ DONE |
| 06 | Invoices & PDF | ✅ DONE |
| 07 | Tickets System | ✅ DONE |
| 08 | REST API Layer | ✅ DONE |
| 09 | Frontend (Next.js) | ✅ DONE |
| 10 | Admin Panel | ✅ DONE |
| 11 | Queue System (BullMQ) | ⬜ TODO |
| 12 | Observability | ⬜ TODO |
| 13 | Testing & CI | ⬜ TODO |
