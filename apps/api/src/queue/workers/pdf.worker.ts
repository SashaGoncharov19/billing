import { Worker } from 'bullmq'
import { bullMqConnection } from '../client'
import type { PdfJob } from '../types'
import { db } from '@entityseven/db'
import { invoices, tenants } from '@entityseven/db'
import { and, eq } from 'drizzle-orm'
import { generateInvoiceHtml } from '../../templates/invoice.html'
import { generatePdf, uploadInvoicePdf } from '../../modules/invoices/invoice.pdf'

async function handleInvoicePdfGeneration(data: { invoiceId: string, tenantId: string }) {
  const { invoiceId, tenantId } = data

  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)),
    with: { items: true }
  })

  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`)

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId)
  })

  if (!tenant) throw new Error(`Tenant ${tenantId} not found`)

  const htmlContent = generateInvoiceHtml(invoice, tenant)
  const pdfBuffer = await generatePdf(htmlContent)
  const key = await uploadInvoicePdf(tenantId, invoiceId, pdfBuffer)

  await db.update(invoices)
    .set({ pdfUrl: key })
    .where(eq(invoices.id, invoiceId))

  console.log(`[PDF WORKER] Generated PDF for invoice ${invoiceId} at ${key}`)
}

let pdfWorker = null
if (process.env.NODE_ENV !== 'test') {
  pdfWorker = new Worker<PdfJob>(
    'pdf-generation',
    async (job) => {
      const { type, data } = job.data

      switch (type) {
        case 'invoice':
          await handleInvoicePdfGeneration(data)
          break
        default:
          // Future extensions for different PDF types (e.g. receipts, reports)
          throw new Error(`Unknown PDF type: ${type}`)
      }
    },
    {
      connection: bullMqConnection,
      concurrency: 2,
    }
  )

  pdfWorker.on('failed', (job, error) => {
    console.error(`[PDF WORKER] Job failed:`, error.message)
  })
}
