# Фаза 11 — Queue System (BullMQ)

## Мета фази

Налаштувати асинхронну обробку фонових задач через BullMQ: email notifications, PDF generation, webhook processing, scheduled jobs.

---

## Залежності

- ✅ Фаза 01 (Redis через docker-compose)
- Використовується: Фаза 05 (webhooks), Фаза 06 (PDF), Фаза 07 (emails)

---

## Структура

```
apps/api/src/
└── queue/
    ├── index.ts                  ← Queue registry та exports
    ├── client.ts                 ← BullMQ connection
    ├── workers/
    │   ├── email.worker.ts
    │   ├── pdf.worker.ts
    │   ├── webhook.worker.ts
    │   └── scheduler.worker.ts   ← cron jobs
    ├── processors/
    │   ├── email/
    │   │   ├── send-invoice-notification.ts
    │   │   ├── send-ticket-notification.ts
    │   │   └── send-payment-receipt.ts
    │   ├── pdf/
    │   │   └── generate-invoice-pdf.ts
    │   ├── webhook/
    │   │   └── process-stripe-webhook.ts
    │   └── scheduler/
    │       └── auto-close-tickets.ts
    └── bull-board.ts             ← monitoring UI
```

---

## Queue Definitions

```typescript
// queue/index.ts
import { Queue } from 'bullmq'
import { redisConnection } from './client'

// 1. Email Queue
export const emailQueue = new Queue('emails', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,  // 2s, 4s, 8s, 16s, 32s
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
})

// 2. PDF Generation Queue
export const pdfQueue = new Queue('pdf-generation', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    timeout: 60000,  // 60 секунд максимум
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
})

// 3. Webhook Processing Queue
export const webhookQueue = new Queue('webhook-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 1000 },  // зберігати більше для debugging
  },
})

// 4. Scheduler Queue (recurring jobs)
export const schedulerQueue = new Queue('scheduler', {
  connection: redisConnection,
})
```

---

## Job Типи

### Email Queue Jobs

```typescript
// types: email queue job data

interface SendInvoiceNotificationJob {
  type: 'send-invoice-notification'
  data: {
    invoiceId: string
    tenantId: string
    recipientEmail: string
    invoiceNumber: number
    totalAmount: string
    currency: string
    dueAt: string
    pdfUrl?: string
  }
}

interface SendTicketNotificationJob {
  type: 'send-ticket-notification'
  data: {
    ticketId: string
    tenantId: string
    eventType: 'created' | 'status_changed' | 'comment_added' | 'assigned'
    recipientEmails: string[]
    ticketSubject: string
    newStatus?: string
    commenterName?: string
  }
}

interface SendPaymentReceiptJob {
  type: 'send-payment-receipt'
  data: {
    paymentId: string
    tenantId: string
    recipientEmail: string
    amount: string
    currency: string
    invoiceNumber: number
  }
}

export type EmailJob =
  | SendInvoiceNotificationJob
  | SendTicketNotificationJob
  | SendPaymentReceiptJob
```

### PDF Queue Jobs

```typescript
interface GenerateInvoicePdfJob {
  invoiceId: string
  tenantId: string
}
```

### Webhook Queue Jobs

```typescript
interface ProcessStripeWebhookJob {
  eventId: string           // Stripe event ID (для idempotency)
  eventType: string
  rawData: Record<string, unknown>
}
```

---

## Workers

### Email Worker

```typescript
// workers/email.worker.ts
import { Worker } from 'bullmq'
import { redisConnection } from '../client'
import type { EmailJob } from '../types'

const emailWorker = new Worker<EmailJob>(
  'emails',
  async (job) => {
    const { type, data } = job.data

    switch (type) {
      case 'send-invoice-notification':
        await sendInvoiceNotification(data)
        break
      case 'send-ticket-notification':
        await sendTicketNotification(data)
        break
      case 'send-payment-receipt':
        await sendPaymentReceipt(data)
        break
      default:
        throw new Error(`Unknown email job type: ${type}`)
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,  // обробляти до 5 emails одночасно
  }
)

emailWorker.on('failed', (job, error) => {
  console.error(`[EMAIL WORKER] Job ${job?.id} failed:`, error.message)
})

emailWorker.on('completed', (job) => {
  console.log(`[EMAIL WORKER] Job ${job.id} completed`)
})
```

### PDF Worker

```typescript
// workers/pdf.worker.ts
import { Worker } from 'bullmq'

const pdfWorker = new Worker<GenerateInvoicePdfJob>(
  'pdf-generation',
  async (job) => {
    const { invoiceId, tenantId } = job.data

    // 1. Fetch invoice з items
    const invoice = await db.query.invoices.findFirst({
      where: and(
        eq(invoices.id, invoiceId),
        eq(invoices.tenantId, tenantId)
      ),
      with: { items: true }
    })

    if (!invoice) throw new Error(`Invoice ${invoiceId} not found`)

    // 2. Fetch tenant для branding
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId)
    })

    if (!tenant) throw new Error(`Tenant ${tenantId} not found`)

    // 3. Generate HTML
    const html = generateInvoiceHtml(invoice, tenant)

    // 4. Generate PDF via Puppeteer
    const pdfBuffer = await generatePdf(html)

    // 5. Upload to S3/R2
    const key = `invoices/${tenantId}/${invoiceId}.pdf`
    await uploadFile(key, pdfBuffer, 'application/pdf')

    // 6. Update invoice.pdf_url in DB
    await db.update(invoices)
      .set({ pdfUrl: key })
      .where(eq(invoices.id, invoiceId))

    console.log(`[PDF WORKER] Generated PDF for invoice ${invoiceId}`)
  },
  {
    connection: redisConnection,
    concurrency: 2,  // PDF generation є CPU intensive
  }
)
```

### Webhook Worker

```typescript
// workers/webhook.worker.ts
import { Worker } from 'bullmq'

const webhookWorker = new Worker<ProcessStripeWebhookJob>(
  'webhook-processing',
  async (job) => {
    const { eventId, eventType, rawData } = job.data

    // Idempotency check (додаткова перевірка)
    const alreadyProcessed = await checkEventProcessed(eventId)
    if (alreadyProcessed) {
      console.log(`[WEBHOOK WORKER] Event ${eventId} already processed, skipping`)
      return
    }

    // Process event
    await processWebhookEvent(eventType, rawData)

    // Mark as processed
    await markEventProcessed(eventId)
  },
  {
    connection: redisConnection,
    concurrency: 3,
  }
)
```

### Scheduler Worker (Cron Jobs)

```typescript
// workers/scheduler.worker.ts
import { Worker } from 'bullmq'

// Recurring jobs реєструються один раз при старті
export async function initScheduler() {
  // Auto-close resolved tickets after 7 days
  await schedulerQueue.add(
    'auto-close-tickets',
    {},
    {
      repeat: { cron: '0 2 * * *' },   // щодня о 02:00
      jobId: 'auto-close-tickets',       // унікальний id для dedupe
    }
  )

  // Cleanup expired idempotency keys
  await schedulerQueue.add(
    'cleanup-idempotency-keys',
    {},
    {
      repeat: { cron: '0 3 * * *' },   // щодня о 03:00
      jobId: 'cleanup-idempotency-keys',
    }
  )
}

const schedulerWorker = new Worker('scheduler', async (job) => {
  switch (job.name) {
    case 'auto-close-tickets':
      await autoCloseResolvedTickets()
      break
    case 'cleanup-idempotency-keys':
      await cleanupExpiredIdempotencyKeys()
      break
    default:
      throw new Error(`Unknown scheduler job: ${job.name}`)
  }
}, { connection: redisConnection })
```

---

## Redis Connection

```typescript
// queue/client.ts
import { Redis } from 'ioredis'

const redisUrl = process.env['REDIS_URL']
if (!redisUrl) throw new Error('REDIS_URL is required')

export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,  // ОБОВ'ЯЗКОВО для BullMQ
  enableReadyCheck: false,
})

// Окремий клієнт для загального використання (не BullMQ)
export const redis = new Redis(redisUrl)
```

---

## Bull Board (Monitoring)

```typescript
// queue/bull-board.ts
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ElysiaAdapter } from '@bull-board/elysia'  // або express adapter

export const bullBoard = createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(pdfQueue),
    new BullMQAdapter(webhookQueue),
    new BullMQAdapter(schedulerQueue),
  ],
  serverAdapter: new ElysiaAdapter('/bull-board'),
})
```

**Доступний лише в dev та staging!** В production — захистити окремим auth.

---

## Email Provider

Для відправки emails використовувати:
- **Development:** `nodemailer` з Mailhog (docker) або Mailtrap
- **Production:** Resend або Postmark

```typescript
// lib/email.ts

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const from = options.from ?? `Entity Seven <noreply@entityseven.com>`

  if (process.env['NODE_ENV'] === 'development') {
    // Log to console in development
    console.log(`[EMAIL] To: ${options.to}, Subject: ${options.subject}`)
    return
  }

  // Resend integration
  await resend.emails.send({
    from,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html,
  })
}
```

---

## Dead Letter Queue (DLQ)

BullMQ зберігає failed jobs автоматично. Для критичних jobs (payments):

```typescript
// Окрема черга для критично важливих retries
export const dlqQueue = new Queue('dead-letter', {
  connection: redisConnection,
})

// Worker для DLQ — manual review
const dlqWorker = new Worker('dead-letter', async (job) => {
  // Alert via Sentry/email про критично важливий failure
  await alertCriticalFailure(job)
}, { connection: redisConnection })
```

---

## Правила для агента

1. **`maxRetriesPerRequest: null`** — обов'язково для BullMQ Redis connection
2. **Idempotent jobs** — кожен job має бути безпечним для повторного виконання
3. **Окремі jobs для різних операцій** — не робити один job що робить 10 речей
4. **Timeout для важких jobs** — PDF generation, webhook processing
5. **Concurrency limits** — PDF = 2, email = 5, webhook = 3
6. **Bull Board тільки для dev** — закрити в production

---

## Definition of Done

- [ ] 4 черги налаштовані (email, pdf, webhook, scheduler)
- [ ] Email worker реалізований з усіма job типами
- [ ] PDF worker реалізований та інтегрований з invoice module
- [ ] Webhook worker обробляє всі Stripe events
- [ ] Scheduler: auto-close tickets + cleanup jobs
- [ ] Bull Board доступний в dev (`/bull-board`)
- [ ] Exponential backoff для всіх queues
- [ ] DLQ для критичних failures
- [ ] Email відправляється в development (console log)
- [ ] Email provider для production (Resend)

---

## Наступна фаза

➡️ [Фаза 12 — Observability](../phase-12-observability/SPEC.md)
