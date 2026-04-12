# Фаза 10 — Admin Panel

## Мета фази

Побудувати адміністративну панель для управління тенантами, користувачами, фінансами та system health.

---

## Залежності

- ✅ Фаза 09 (Frontend базова структура)
- ✅ Фаза 08 (Admin API namespace)

---

## Доступ

- URL: `/admin/*`
- Вимога: роль `admin` або `owner` в тенанті
- Superadmin (майбутнє): доступ до ВСІХ тенантів

---

## Сторінки Admin Panel

### Admin Dashboard (`/admin`)

```
┌─────────────────────────────────────────────────────┐
│  Admin Dashboard                                     │
│                                                      │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌────────┐ │
│  │  Total  │  │  Revenue │  │ Active │  │ Open   │ │
│  │ Tenants │  │  (30d)   │  │  Subs  │  │Tickets │ │
│  │    12   │  │ $12,400  │  │    8   │  │   15   │ │
│  └─────────┘  └──────────┘  └────────┘  └────────┘ │
│                                                      │
│  Recent Activity (Audit Log)                         │
│  ┌──────────────────────────────────────────────────┐│
│  │ user.login    | admin@es.com   | 2 minutes ago   ││
│  │ invoice.paid  | tenant A       | 15 minutes ago  ││
│  │ ticket.created| user@example   | 1 hour ago      ││
│  └──────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### Tenants Management (`/admin/tenants`)

**Таблиця:**
| Name | Slug | Members | Status | Plan | Created |
|------|------|---------|--------|------|---------|
| Acme Corp | acme | 5 | Active | Pro | Jan 1 |

**Дії:**
- View tenant details
- Suspend tenant (soft disable)
- View tenant's invoices та payments

### Tenant Detail (`/admin/tenants/[id]`)

- Загальна інформація (name, logo, colors)
- Members list з ролями
- Subscription status
- Invoice history
- Payment history
- Audit log entries

### Users Management (`/admin/users`)

**Таблиця:** email, memberships count, created, last login

**Дії:**
- View profile
- View memberships
- Disable user (soft)

### Invoices Overview (`/admin/invoices`)

Всі інвойси всіх тенантів (for superadmin).
Фільтри: tenant, status, date range, amount range.

### Tickets Overview (`/admin/tickets`)

**Власні тікети тенанта:**
- Всі відкриті тікети
- Можливість призначати
- Bulk status update

### Audit Log Viewer (`/admin/audit-logs`)

```
┌──────────────────────────────────────────────────────┐
│  Filters: Action ▼  Resource ▼  User ▼  Date Range   │
│                                                       │
│  Timestamp            Action          User     IP     │
│  2024-01-15 14:23:01  invoice.created john@es  1.2.3.4│
│  2024-01-15 14:20:15  user.login      john@es  1.2.3.4│
└──────────────────────────────────────────────────────┘
```

- Пошук по action, user, resource
- Export CSV (майбутнє)
- Лише читання (immutable)

---

## Компоненти Admin Panel

```
src/app/admin/
├── layout.tsx                    ← Admin layout (окремий sidebar)
├── page.tsx                      ← Dashboard
├── tenants/
│   ├── page.tsx
│   └── [id]/page.tsx
├── users/
│   ├── page.tsx
│   └── [id]/page.tsx
├── invoices/page.tsx
├── tickets/page.tsx
└── audit-logs/page.tsx
```

---

## Admin Sidebar

```tsx
// Відмінний від клієнтського sidebar
const adminNavItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Tenants', href: '/admin/tenants', icon: Building2 },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Invoices', href: '/admin/invoices', icon: FileText },
  { label: 'Tickets', href: '/admin/tickets', icon: Ticket },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: History },
  // Separator
  { label: 'Back to Portal', href: '/dashboard', icon: ArrowLeft },
]
```

---

## Audit Log — Всі Events

Кожна admin дія автоматично логується. Список усіх actions:

### Auth events
- `user.registered`
- `user.login`
- `user.logout`
- `user.password_changed`

### Tenant events
- `tenant.created`
- `tenant.updated`
- `tenant.logo_updated`
- `tenant.suspended`

### Member events
- `member.invited`
- `member.role_changed`
- `member.removed`

### Invoice events
- `invoice.created`
- `invoice.issued`
- `invoice.voided`
- `invoice.pdf_generated`

### Billing events
- `billing.checkout_started`
- `billing.checkout_completed`
- `billing.payment_succeeded`
- `billing.payment_failed`
- `billing.subscription_canceled`

### Ticket events
- `ticket.created`
- `ticket.status_changed`
- `ticket.assigned`
- `ticket.comment_added`

---

## Audit Logger Utility

```typescript
// lib/audit.ts
import { db } from '@entityseven/db'
import { auditLogs } from '@entityseven/db/schema'

interface AuditOptions {
  tenantId: string
  userId?: string
  action: string
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function logAudit(options: AuditOptions, tx?: DB): Promise<void> {
  const client = tx ?? db
  await client.insert(auditLogs).values({
    tenantId: options.tenantId,
    userId: options.userId,
    action: options.action,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    metadata: options.metadata,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  })
}
```

---

## Plugin Management UI (MVP scope: basic)

Простий список плагінів із можливістю enable/disable:

```tsx
// admin/plugins/page.tsx (майбутнє, але підготувати UI)
interface Plugin {
  id: string
  name: string
  version: string
  description: string
  isEnabled: boolean
}

// Компонент:
<PluginCard
  plugin={plugin}
  onToggle={(id, enabled) => togglePlugin(id, enabled)}
/>
```

---

## API Ендпоінти для Admin

```
GET  /api/admin/stats                 ← dashboard stats
GET  /api/admin/tenants               ← all tenants
GET  /api/admin/tenants/:id           ← tenant detail
GET  /api/admin/users                 ← all users
GET  /api/admin/audit-logs            ← audit log (з пагінацією + фільтрами)
GET  /api/admin/invoices              ← all invoices (superadmin)
PATCH /api/admin/tenants/:id/suspend  ← suspend tenant
```

---

## Definition of Done

- [ ] Admin Dashboard з stats cards
- [ ] Tenant management (list + detail)
- [ ] User list та detail
- [ ] Audit Log viewer з фільтрами
- [ ] All admin actions записуються в audit_log
- [ ] Admin routes захищені (лише admin/owner)
- [ ] Окремий admin sidebar
- [ ] Tickets overview для Admin
- [ ] Back to Portal navigation

---

## Наступна фаза

➡️ [Фаза 11 — Queue System (BullMQ)](../phase-11-queue/SPEC.md)
