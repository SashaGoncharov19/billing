# Фаза 06 — Invoices & PDF Generation

## Мета фази

Реалізувати повну систему інвойсів: CRUD з state machine, автоматична нумерація per-tenant, генерація PDF через Puppeteer, зберігання в S3/R2.

---

## Залежності

- ✅ Фаза 02 (таблиці: invoices, invoice_items)
- ✅ Фаза 04 (tenant context)
- ✅ Фаза 05 (payments — invoice може бути оплачений через білінг)
- ✅ Фаза 11 частково (BullMQ — PDF генерація асинхронна)

---

## Структура модуля

```
src/
├── modules/
│   └── invoices/
│       ├── invoice.router.ts
│       ├── invoice.service.ts
│       ├── invoice.schema.ts
│       ├── invoice.numbering.ts      ← sequential numbering
│       ├── invoice.pdf.ts            ← PDF generation via Puppeteer
│       ├── invoice.types.ts
│       └── invoice.test.ts
│
└── templates/
    └── invoice.html.ts               ← HTML шаблон для PDF
```

---

## Invoice State Machine

```
draft → open → paid
              ↳ void (лише якщо не paid)
draft → void
open → uncollectible (manual, admin only)
```

**Правила переходів:**
- `draft → open`: встановлює `issued_at`, `number` (якщо не встановлено), тригерить PDF генерацію
- `open → paid`: встановлює `paid_at`, лише якщо `paid_amount >= total_amount`
- `* → void`: лише admin, лише якщо не `paid`, встановлює `voided_at`
- Після `void` або `paid` — жодних змін (immutable)

```typescript
// invoice.service.ts

const VALID_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['open', 'void'],
  open: ['paid', 'void', 'uncollectible'],
  paid: [],         // terminal state
  void: [],         // terminal state
  uncollectible: [],
}

function validateTransition(current: InvoiceStatus, next: InvoiceStatus) {
  if (!VALID_TRANSITIONS[current]?.includes(next)) {
    throw new InvalidTransitionError(`Cannot transition from ${current} to ${next}`)
  }
}
```

---

## Sequential Invoice Numbering

Номер інвойсу — послідовний, унікальний в межах tenant.

```typescript
// invoice.numbering.ts

export async function getNextInvoiceNumber(tenantId: string, tx: DB): Promise<number> {
  // SELECT MAX(number) FROM invoices WHERE tenant_id = ? FOR UPDATE
  // Використати FOR UPDATE щоб запобігти race condition
  const result = await tx
    .select({ maxNumber: sql<number>`MAX(${invoices.number})` })
    .from(invoices)
    .where(eq(invoices.tenantId, tenantId))
    .for('update')

  return (result[0]?.maxNumber ?? 0) + 1
}
```

**ВАЖЛИВО:** `FOR UPDATE` lock запобігає duplicate numbers при concurrent requests.

---

## API Ендпоінти

### `POST /api/v1/invoices`

**Auth:** admin або owner

**Запит:**
```json
{
  "currency": "USD",
  "dueAt": "2024-02-28T00:00:00Z",
  "notes": "Thank you for your business",
  "items": [
    {
      "description": "Pro Plan - January 2024",
      "quantity": 1,
      "unitPrice": "99.00",
      "taxRate": "0.20",
      "productId": "uuid-optional"
    }
  ]
}
```

**Дії:**
1. Validate items (мінімум 1 item)
2. Розрахувати subtotal, tax, total для кожного item
3. Розрахувати загальні суми
4. Зберегти invoice + items в транзакції
5. Status: `draft`
6. Audit log: `invoice.created`

**Розрахунок:**
```
item.totalAmount = item.quantity * item.unitPrice * (1 + item.taxRate)
invoice.subtotalAmount = SUM(item.quantity * item.unitPrice)
invoice.taxAmount = SUM(item.quantity * item.unitPrice * item.taxRate)
invoice.totalAmount = invoice.subtotalAmount + invoice.taxAmount
```

---

### `GET /api/v1/invoices`

**Auth:** authenticated member

**Query params:**
- `status` — фільтр по статусу
- `cursor` — cursor-based pagination
- `limit` — default 20, max 100

**Відповідь:**
```json
{
  "data": [
    {
      "id": "uuid",
      "number": 42,
      "status": "open",
      "totalAmount": "118.80",
      "currency": "USD",
      "issuedAt": "2024-01-15T00:00:00Z",
      "dueAt": "2024-02-15T00:00:00Z",
      "pdfUrl": "https://signed-url..."
    }
  ],
  "nextCursor": "...",
  "hasMore": true
}
```

---

### `GET /api/v1/invoices/:id`

З items та payment history.

---

### `PATCH /api/v1/invoices/:id`

**Auth:** admin або owner
**Обмеження:** лише `draft` статус

---

### `POST /api/v1/invoices/:id/issue`

**Auth:** admin або owner

Перевести invoice з `draft` → `open`:
1. Validate transition
2. Встановити number (якщо немає) через `getNextInvoiceNumber` в транзакції
3. Встановити `issued_at = now()`
4. Enqueue PDF generation job
5. (майбутнє) відправити email клієнту

---

### `POST /api/v1/invoices/:id/void`

**Auth:** admin

Перевести в `void` — лише якщо не `paid`.

---

### `GET /api/v1/invoices/:id/pdf`

Повернути signed temporary URL (1 година) для завантаження PDF.

```typescript
// Генерувати signed URL з S3/R2
const url = await storage.getSignedUrl(`invoices/${tenantId}/${invoiceId}.pdf`, {
  expiresIn: 3600
})
return { url }
```

---

## PDF Generation

### Технологія

- **Puppeteer** (безголова Chromium) рендерить HTML → PDF
- Виконується **асинхронно через BullMQ** (не блокує request)
- PDF зберігається в **S3/R2**

### BullMQ Job

```typescript
// Назва черги: 'pdf-generation'
interface PdfGenerationJob {
  invoiceId: string
  tenantId: string
}
```

### HTML Шаблон

```typescript
// templates/invoice.html.ts

export function generateInvoiceHtml(invoice: InvoiceWithItems, tenant: Tenant): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    /* Inline CSS для PDF рендерингу */
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      color: #111827;
      margin: 0;
      padding: 40px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }

    .logo {
      max-height: 60px;
    }

    .invoice-number {
      font-size: 24px;
      font-weight: 700;
      color: ${tenant.primaryColor ?? '#3B82F6'};
    }

    /* ... решта стилів */

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      background-color: #F9FAFB;
      text-align: left;
      padding: 12px;
      border-bottom: 2px solid #E5E7EB;
    }

    td {
      padding: 12px;
      border-bottom: 1px solid #E5E7EB;
    }

    .totals {
      text-align: right;
      margin-top: 24px;
    }

    .total-row {
      font-weight: 700;
      font-size: 18px;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      background-color: ${invoice.status === 'paid' ? '#D1FAE5' : '#FEF3C7'};
      color: ${invoice.status === 'paid' ? '#065F46' : '#92400E'};
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${tenant.logoUrl ? `<img src="${tenant.logoUrl}" class="logo" />` : ''}
      <h2>${tenant.name}</h2>
    </div>
    <div>
      <div class="invoice-number">Invoice #${String(invoice.number).padStart(6, '0')}</div>
      <div>Status: <span class="status-badge">${invoice.status}</span></div>
      <div>Issued: ${formatDate(invoice.issuedAt)}</div>
      <div>Due: ${formatDate(invoice.dueAt)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Tax</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map(item => `
        <tr>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>${formatMoney(item.unitPrice, invoice.currency)}</td>
          <td>${Number(item.taxRate) * 100}%</td>
          <td>${formatMoney(item.totalAmount, invoice.currency)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div>Subtotal: ${formatMoney(invoice.subtotalAmount, invoice.currency)}</div>
    <div>Tax: ${formatMoney(invoice.taxAmount, invoice.currency)}</div>
    <div class="total-row">Total: ${formatMoney(invoice.totalAmount, invoice.currency)}</div>
  </div>

  ${invoice.notes ? `<div class="notes"><strong>Notes:</strong><br>${invoice.notes}</div>` : ''}
</body>
</html>
  `
}
```

### Puppeteer Service

```typescript
// invoice.pdf.ts
import puppeteer from 'puppeteer'

export async function generatePdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
    })

    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
```

---

## Storage (S3/R2)

### ключ для PDF:
```
invoices/{tenantId}/{invoiceId}.pdf
```

### S3 lib:
```typescript
// lib/storage.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const storage = new S3Client({
  endpoint: process.env['STORAGE_ENDPOINT'],
  region: process.env['STORAGE_REGION'] ?? 'auto',
  credentials: {
    accessKeyId: process.env['STORAGE_ACCESS_KEY_ID']!,
    secretAccessKey: process.env['STORAGE_SECRET_ACCESS_KEY']!,
  },
})

export async function uploadFile(key: string, body: Buffer, mimeType: string) {
  await storage.send(new PutObjectCommand({
    Bucket: process.env['STORAGE_BUCKET']!,
    Key: key,
    Body: body,
    ContentType: mimeType,
  }))
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(storage, new GetObjectCommand({
    Bucket: process.env['STORAGE_BUCKET']!,
    Key: key,
  }), { expiresIn })
}
```

---

## Multi-Currency Support

- Всі суми зберігаються як `NUMERIC(12, 2)` в БД
- Currency code зберігається як ISO 4217 (USD, EUR, UAH тощо)
- Конвертація валют — НЕ в MVP scope (майбутня фіча)
- Форматування через `Intl.NumberFormat`:

```typescript
function formatMoney(amount: string | number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(amount))
}
```

---

## Тести

```typescript
describe('Invoice Service', () => {
  describe('createInvoice', () => {
    it('calculates totals correctly including tax')
    it('validates minimum 1 line item')
    it('creates in draft status')
  })

  describe('issueInvoice', () => {
    it('assigns sequential number per tenant')
    it('two concurrent requests get different numbers')  // race condition test
    it('cannot issue already open invoice')
  })

  describe('state machine', () => {
    it('draft can transition to open')
    it('paid invoice cannot be voided')
    it('void invoice cannot transition to any state')
  })

  describe('PDF generation', () => {
    it('generates valid PDF buffer')
    it('uploads to S3 and updates pdf_url')
    it('signed URL is returned for download')
  })
})
```

---

## Definition of Done

- [ ] Invoice CRUD з повним state machine
- [ ] Sequential numbering без race conditions (FOR UPDATE)
- [ ] PDF генерується через Puppeteer та зберігається в S3/R2
- [ ] PDF generation через BullMQ job (асинхронно)
- [ ] PDF download через signed URL (1 година)
- [ ] Multi-currency (USD, EUR, UAH мінімум)
- [ ] Tenant branding в PDF (logo, колір)
- [ ] Unit тести для розрахунків та state machine
- [ ] Integration тести для API ендпоінтів

---

## Наступна фаза

➡️ [Фаза 07 — Tickets System](../phase-07-tickets/SPEC.md)
