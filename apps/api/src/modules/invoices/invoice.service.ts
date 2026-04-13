import { db, invoices, invoiceItems } from '@entityseven/db'
import { eq, and, desc, type SQL } from 'drizzle-orm'
import { InvoiceStatus, VALID_TRANSITIONS, InvalidTransitionError } from './invoice.types'
import { getNextInvoiceNumber } from './invoice.numbering'
import { getInvoiceSignedUrl } from './invoice.pdf'
import { pdfQueue } from '../../queue'

export class InvoiceService {
  private validateTransition(current: InvoiceStatus, next: InvoiceStatus) {
    if (!VALID_TRANSITIONS[current]?.includes(next)) {
      throw new InvalidTransitionError(`Cannot transition from ${current} to ${next}`)
    }
  }

  async createInvoice(tenantId: string, userId: string, data: { currency?: string; dueAt?: string; notes?: string; items: any[] }) {
    if (!data.items || data.items.length === 0) {
      throw new Error('Invoice must have at least 1 item')
    }

    let subtotalAmount = 0
    let taxAmount = 0

    const itemsToInsert = data.items.map(item => {
      const q = Number(item.quantity)
      const p = parseFloat(item.unitPrice)
      const t = parseFloat(item.taxRate)
      const lineTotal = q * p * (1 + t)

      subtotalAmount += (q * p)
      taxAmount += (q * p * t)

      return {
        ...item,
        unitPrice: String(p),
        taxRate: String(t),
        totalAmount: String(lineTotal.toFixed(2))
      }
    })

    const totalAmount = subtotalAmount + taxAmount

    return await db.transaction(async (tx) => {
      // Create invoice document
      const [invoice] = await tx.insert(invoices).values({
        tenantId,
        status: 'draft',
        currency: data.currency || 'USD',
        subtotalAmount: String(subtotalAmount.toFixed(2)),
        taxAmount: String(taxAmount.toFixed(2)),
        totalAmount: String(totalAmount.toFixed(2)),
        notes: data.notes,
        createdByUserId: userId,
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
      }).returning()

      if (!invoice) throw new Error('Failed to create invoice')

      // Add items
      await tx.insert(invoiceItems).values(
        itemsToInsert.map(item => ({
          invoiceId: invoice.id,
          ...item
        }))
      )

      return invoice
    })
  }

  async getInvoices(tenantId: string, status?: string, userId?: string) {
    const limit = 50
    const conditions: SQL[] = [eq(invoices.tenantId, tenantId)]
    if (status) {
      conditions.push(eq(invoices.status, status as InvoiceStatus))
    }
    if (userId) {
      conditions.push(eq(invoices.createdByUserId, userId))
    }

    const data = await db.query.invoices.findMany({
      where: and(...conditions),
      orderBy: [desc(invoices.createdAt)],
      limit
    })

    return { data }
  }

  async getInvoiceById(tenantId: string, invoiceId: string) {
    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)),
      with: {
        items: true
      }
    })
    
    if (!invoice) throw new Error('Invoice not found')
    return invoice
  }

  async issueInvoice(tenantId: string, invoiceId: string) {
    return await db.transaction(async (tx) => {
      const invoice = await tx.query.invoices.findFirst({
        where: and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)),
      })

      if (!invoice) throw new Error('Invoice not found')
      this.validateTransition(invoice.status as InvoiceStatus, 'open')

      const nextNumber = await getNextInvoiceNumber(tenantId, tx)

      const [updated] = await tx.update(invoices)
        .set({
          status: 'open',
          number: nextNumber,
          issuedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId))
        .returning()

      await pdfQueue.add('generate-pdf', {
        type: 'invoice',
        data: { tenantId, invoiceId }
      })
      
      return updated
    })
  }

  async voidInvoice(tenantId: string, invoiceId: string) {
    return await db.transaction(async (tx) => {
      const invoice = await tx.query.invoices.findFirst({
        where: and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId))
      })

      if (!invoice) throw new Error('Invoice not found')
      this.validateTransition(invoice.status as InvoiceStatus, 'void')

      if (invoice.paidAmount !== '0') { // simplification
        throw new Error('Cannot void invoice that has payments')
      }

      const [updated] = await tx.update(invoices)
        .set({
          status: 'void',
          voidedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId))
        .returning()

      return updated
    })
  }

  async getPdfSignedUrl(tenantId: string, invoiceId: string) {
    const invoice = await this.getInvoiceById(tenantId, invoiceId)
    if (!invoice.pdfUrl) {
      throw new Error('PDF not generated yet')
    }
    return getInvoiceSignedUrl(invoice.pdfUrl, 3600)
  }

  async queuePdfGeneration(tenantId: string, invoiceId: string) {
    await this.getInvoiceById(tenantId, invoiceId) // validate it exists
    await pdfQueue.add('generate-pdf', {
      type: 'invoice',
      data: { tenantId, invoiceId }
    })
    return { status: 'queued' }
  }

  async markPaid(tenantId: string, invoiceId: string) {
    const updatedInvoice = await db.transaction(async (tx) => {
      const invoice = await tx.query.invoices.findFirst({
        where: and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId))
      })

      if (!invoice) throw new Error('Invoice not found')
      this.validateTransition(invoice.status as InvoiceStatus, 'paid')

      const [updated] = await tx.update(invoices)
        .set({
          status: 'paid',
          paidAmount: invoice.totalAmount,
          paidAt: new Date(),
          updatedAt: new Date(),
          pdfUrl: null // Invalidate the old PDF so it can be regenerated
        })
        .where(eq(invoices.id, invoiceId))
        .returning()
        
      return updated
    })

    // Queue PDF regeneration because the status and paid details have changed
    await this.queuePdfGeneration(tenantId, invoiceId).catch(console.error)

    // Simulate Payment Confirmed Email dispatch to the user
    console.log(`[EMAIL DISPATCH] Mock sending "Payment Confirmed" email to user for invoice ${invoiceId}`)

    return updatedInvoice
  }
}
