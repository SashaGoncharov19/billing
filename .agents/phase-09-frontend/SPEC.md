# Фаза 09 — Frontend (Next.js)

## Мета фази

Побудувати повноцінний клієнтський портал на Next.js 15 з App Router, design system на базі Tailwind + shadcn/ui, dark/light theme, i18n, та tenant branding.

---

## Залежності

- ✅ Фаза 08 (REST API повністю готовий)

---

## Tech Stack

| Технологія | Версія | Призначення |
|-----------|--------|-------------|
| Next.js | 15 (App Router) | SSR/SSG framework |
| React | 19 | UI |
| TypeScript | 5 strict | Типізація |
| Tailwind CSS | 4 | Стилі |
| shadcn/ui | latest | Компоненти |
| Tanstack Query | 5 | Server state management |
| Zustand | latest | Client state |
| React Hook Form | 7 | Forms |
| Zod | 3 | Form validation |
| next-intl | 3 | i18n |
| next-themes | latest | Theme switching |

---

## Структура `apps/web/src/`

```
src/
├── app/                              ← Next.js App Router
│   ├── layout.tsx                    ← Root layout (providers)
│   ├── page.tsx                      ← Landing / redirect
│   │
│   ├── (auth)/                       ← Auth routes (без sidebar)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   │
│   ├── (portal)/                    ← Authenticated routes
│   │   ├── layout.tsx               ← Sidebar + header layout
│   │   ├── dashboard/page.tsx
│   │   ├── billing/
│   │   │   ├── page.tsx             ← Subscription overview
│   │   │   └── success/page.tsx     ← Post-checkout success
│   │   ├── invoices/
│   │   │   ├── page.tsx             ← Invoice list
│   │   │   └── [id]/page.tsx        ← Invoice detail
│   │   ├── tickets/
│   │   │   ├── page.tsx             ← Ticket list
│   │   │   ├── new/page.tsx         ← Create ticket
│   │   │   └── [id]/page.tsx        ← Ticket detail
│   │   ├── services/page.tsx
│   │   └── settings/
│   │       ├── page.tsx             ← General settings
│   │       ├── profile/page.tsx
│   │       └── billing/page.tsx     ← Payment methods
│   │
│   └── admin/                       ← Admin panel routes
│       ├── layout.tsx
│       ├── page.tsx                 ← Admin dashboard
│       ├── tenants/page.tsx
│       ├── users/page.tsx
│       ├── invoices/page.tsx
│       ├── tickets/page.tsx
│       └── audit-logs/page.tsx
│
├── components/
│   ├── ui/                          ← shadcn/ui components (auto-generated)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── MobileNav.tsx
│   │   └── ThemeToggle.tsx
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── billing/
│   │   ├── SubscriptionCard.tsx
│   │   ├── PlanSelector.tsx
│   │   └── PaymentMethodCard.tsx
│   ├── invoices/
│   │   ├── InvoiceTable.tsx
│   │   ├── InvoiceStatusBadge.tsx
│   │   └── InvoiceDetail.tsx
│   ├── tickets/
│   │   ├── TicketList.tsx
│   │   ├── TicketDetail.tsx
│   │   ├── TicketComment.tsx
│   │   └── CreateTicketForm.tsx
│   ├── settings/
│   │   ├── ProfileForm.tsx
│   │   ├── BrandingForm.tsx
│   │   └── MemberList.tsx
│   └── shared/
│       ├── DataTable.tsx
│       ├── Pagination.tsx
│       ├── StatusBadge.tsx
│       ├── EmptyState.tsx
│       ├── LoadingSpinner.tsx
│       ├── ConfirmDialog.tsx
│       └── CurrencyDisplay.tsx
│
├── hooks/
│   ├── useAuth.ts                   ← auth state
│   ├── useTenant.ts                 ← current tenant
│   ├── useInvoices.ts               ← invoice queries
│   ├── useTickets.ts                ← ticket queries
│   └── useBilling.ts                ← billing queries
│
├── lib/
│   ├── api.ts                       ← API client (fetch wrapper)
│   ├── auth.ts                      ← auth utilities
│   └── utils.ts                     ← cn(), formatDate(), etc
│
├── store/
│   └── auth.store.ts                ← Zustand auth store
│
├── types/
│   └── api.ts                       ← API response types (з бекенду)
│
└── messages/                        ← i18n translation files
    ├── en.json
    └── uk.json
```

---

## Design System

### Tailwind CSS Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // CSS variables для tenant branding
        brand: {
          primary: 'hsl(var(--brand-primary))',
          secondary: 'hsl(var(--brand-secondary))',
        },
        // Semantic colors
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        destructive: 'hsl(var(--destructive))',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

### CSS Variables (globals.css)

```css
/* src/app/globals.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --destructive: 0 84.2% 60.2%;
    --radius: 0.5rem;

    /* Tenant branding values (overridden via JS) */
    --brand-primary: 221 83% 53%;       /* #3B82F6 default */
    --brand-secondary: 224 76% 48%;     /* #1E40AF default */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --destructive: 0 62.8% 30.6%;
  }
}
```

---

## Tenant Branding Dynamic Application

При завантаженні PortalLayout — отримати tenant дані і встановити CSS variables:

```tsx
// components/layout/TenantProvider.tsx
'use client'

import { useEffect } from 'react'
import { useTenant } from '@/hooks/useTenant'

function hexToHsl(hex: string): string {
  // Convert #3B82F6 to HSL values for CSS variables
  // ...implementation
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenant()

  useEffect(() => {
    if (tenant?.primaryColor) {
      document.documentElement.style.setProperty(
        '--brand-primary',
        hexToHsl(tenant.primaryColor)
      )
    }
    if (tenant?.secondaryColor) {
      document.documentElement.style.setProperty(
        '--brand-secondary',
        hexToHsl(tenant.secondaryColor)
      )
    }
    if (tenant?.logoUrl) {
      // Update favicon or apply logo elsewhere
    }
  }, [tenant])

  return <>{children}</>
}
```

---

## API Client

```typescript
// lib/api.ts

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface ApiOptions extends RequestInit {
  token?: string
}

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { token, ...init } = options

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    credentials: 'include',  // для cookies (refresh token)
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new ApiError(response.status, error.code, error.message, error.details)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
  }
}
```

---

## Auth Flow

### Zustand Auth Store

```typescript
// store/auth.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  accessToken: string | null
  user: User | null
  tenant: Tenant | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User, tenant: Tenant) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      tenant: null,
      isAuthenticated: false,
      setAuth: (accessToken, user, tenant) =>
        set({ accessToken, user, tenant, isAuthenticated: true }),
      clearAuth: () =>
        set({ accessToken: null, user: null, tenant: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ accessToken: state.accessToken }),  // не зберігати user data
    }
  )
)
```

### Token Refresh (автоматичний)

Перехоплювати 401 відповіді і автоматично оновлювати access token через `/auth/refresh`.

---

## Сторінки

### Dashboard (`/dashboard`)

```
┌─────────────────────────────────────────────────┐
│  Welcome back, John! 👋                          │
│                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │
│  │ Invoices│ │   Paid  │ │  Open   │ │Tickets│ │
│  │   12    │ │  $2,400 │ │ 3 open  │ │   4   │ │
│  └─────────┘ └─────────┘ └─────────┘ └───────┘ │
│                                                  │
│  Recent Invoices              Subscription       │
│  ┌───────────────────────┐  ┌──────────────────┐│
│  │ #042 | $118 | Open    │  │ Pro Plan         ││
│  │ #041 | $99  | Paid ✓  │  │ $99/month        ││
│  │ #040 | $450 | Paid ✓  │  │ Renews Feb 1     ││
│  └───────────────────────┘  └──────────────────┘│
└─────────────────────────────────────────────────┘
```

### Invoices (`/invoices`)

- Таблиця з фільтрами (status, date range)
- Статус badge (draft/open/paid/void) з кольором
- Дії: View, Download PDF, Void (admin)
- Pagination

### Invoice Detail (`/invoices/[id]`)

- Повна інформація інвойсу
- Line items table з subtotals
- Payment history
- Download PDF кнопка
- Status timeline

### Billing (`/billing`)

- Поточна підписка (plan, status, renewal date)
- "Upgrade/Change Plan" → Stripe Checkout
- "Manage Billing" → Stripe Customer Portal
- Payment history

### Tickets (`/tickets`)

- List з фільтрами
- Create ticket форма
- Status badges

### Ticket Detail (`/tickets/[id]`)

- Початкове повідомлення
- Comment thread
- Status/priority (visible to all, editable by admin)
- Add comment form
- Internal note toggle (admin only)

### Settings

**Profile tab:**
- Ім'я, email, language preference, theme

**Tenant tab (admin):**
- Tenant name, logo upload, brand colors (color pickers)
- Member management

**Billing tab:**
- Poточний план, payment method через Stripe Portal

---

## i18n Setup

```json
// messages/en.json
{
  "nav": {
    "dashboard": "Dashboard",
    "billing": "Billing",
    "invoices": "Invoices",
    "tickets": "Tickets",
    "services": "Services",
    "settings": "Settings"
  },
  "invoices": {
    "title": "Invoices",
    "status": {
      "draft": "Draft",
      "open": "Open",
      "paid": "Paid",
      "void": "Void"
    },
    "empty": "No invoices found",
    "downloadPdf": "Download PDF"
  },
  "tickets": {
    "title": "Support Tickets",
    "new": "New Ticket",
    "status": {
      "open": "Open",
      "in_progress": "In Progress",
      "waiting_customer": "Waiting",
      "resolved": "Resolved",
      "closed": "Closed"
    }
  },
  "auth": {
    "login": "Sign In",
    "register": "Create Account",
    "logout": "Sign Out",
    "email": "Email",
    "password": "Password"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "loading": "Loading...",
    "error": "Something went wrong"
  }
}
```

```json
// messages/uk.json
{
  "nav": {
    "dashboard": "Дашборд",
    "billing": "Білінг",
    "invoices": "Інвойси",
    "tickets": "Тікети",
    "services": "Сервіси",
    "settings": "Налаштування"
  },
  "invoices": {
    "title": "Інвойси",
    "status": {
      "draft": "Чернетка",
      "open": "Відкритий",
      "paid": "Оплачений",
      "void": "Анульований"
    },
    "empty": "Інвойси не знайдені",
    "downloadPdf": "Завантажити PDF"
  },
  "tickets": {
    "title": "Тікети підтримки",
    "new": "Новий тікет",
    "status": {
      "open": "Відкритий",
      "in_progress": "В процесі",
      "waiting_customer": "Очікує відповіді",
      "resolved": "Вирішений",
      "closed": "Закритий"
    }
  },
  "auth": {
    "login": "Увійти",
    "register": "Створити акаунт",
    "logout": "Вийти",
    "email": "Email",
    "password": "Пароль"
  },
  "common": {
    "save": "Зберегти",
    "cancel": "Скасувати",
    "delete": "Видалити",
    "edit": "Редагувати",
    "loading": "Завантаження...",
    "error": "Щось пішло не так"
  }
}
```

---

## Route Protection (Middleware)

```typescript
// middleware.ts (Next.js middleware)
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  const { pathname } = request.nextUrl

  const publicPaths = ['/login', '/register', '/', '/health']
  const isPublic = publicPaths.some(p => pathname.startsWith(p))

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

---

## Responsive Design Rules

- **Mobile first** — базові стилі для mobile, Tailwind breakpoints для більших екранів
- **Sidebar collapse** — на < 768px sidebar стає drawer
- **Table overflow** — горизонтальний scroll на mobile для таблиць
- **Touch targets** — мінімум 44x44px для кнопок на mobile

---

## Definition of Done

- [ ] Next.js 15 App Router налаштований
- [ ] shadcn/ui компоненти встановлені та налаштовані
- [ ] Light/Dark theme з persisted preference (next-themes)
- [ ] i18n для EN та UK (next-intl)
- [ ] Tenant branding через CSS variables
- [ ] Auth flow: login, register, logout, auto-refresh
- [ ] Всі сторінки реалізовані: Dashboard, Billing, Invoices, Tickets, Settings
- [ ] Invoice PDF download
- [ ] Responsive design (mobile + desktop)
- [ ] Route protection middleware
- [ ] Loading states та error handling
- [ ] Tanstack Query для server state
- [ ] Zustand для auth state

---

## Наступна фаза

➡️ [Фаза 10 — Admin Panel](../phase-10-admin/SPEC.md)
