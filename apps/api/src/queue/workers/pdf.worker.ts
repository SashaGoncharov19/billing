import { Worker } from 'bullmq'
import { bullMqConnection } from '../client'
import type { PdfJob } from '../types'
import { db } from '@entityseven/db'
import { invoices, appSettings } from '@entityseven/db'
import { and, eq } from 'drizzle-orm'
import { generateInvoiceHtml, type InvoiceViewData } from '@api/templates/invoice.html'
import { generatePdf, uploadInvoicePdf, deleteInvoicePdf } from '@api/modules/invoices/invoice.pdf'

async function handleInvoicePdfGeneration(data: { invoiceId: string; tenantId: string }) {
  const { invoiceId, tenantId } = data

  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)),
    with: { items: true },
  })

  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`)

  const settings = await db.query.appSettings.findFirst({
    where: eq(appSettings.id, 'global'),
  })

  // We still do tenant cleanup or S3 upload keys on tenantId, so that doesn't break S3 structure
  const htmlContent = generateInvoiceHtml(invoice as unknown as InvoiceViewData, settings)
  const pdfBuffer = await generatePdf(htmlContent)
  await deleteInvoicePdf(tenantId, invoiceId) // Clean up the old one from S3 before overwriting
  const key = await uploadInvoicePdf(tenantId, invoiceId, pdfBuffer)

  await db.update(invoices).set({ pdfUrl: key }).where(eq(invoices.id, invoiceId))

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
    },
  )

  pdfWorker.on('failed', (job, error) => {
    console.error(`[PDF WORKER] Job failed:`, error.message)
  })
}
