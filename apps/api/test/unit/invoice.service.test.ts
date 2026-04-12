import { describe, it, expect, beforeEach } from 'bun:test'
import { InvoiceService } from '../../src/modules/invoices/invoice.service'
import { resetDb } from '../helpers/db'
import { setupTestTenant } from '../helpers/setup'

describe('InvoiceService - state transitions', () => {
  const invoiceService = new InvoiceService()

  beforeEach(async () => {
    await resetDb()
  })

  it('creates an invoice safely scoped to a tenant without throwing', async () => {
      const { tenantId, userId } = await setupTestTenant()

      const result = await invoiceService.createInvoice(tenantId, userId, {
          currency: 'USD',
          items: [
              { description: 'Item 1', quantity: 2, unitPrice: '50.00' },
          ]
      })

      expect(result).toBeDefined()
      expect(result.status).toBe('draft')
      // Note: Math checks, 2 * 50 = 100
      expect(Number(result.subtotalAmount)).toBe(100)
  })

  it('allows draft → open transition while tracking sequential numbers', async () => {
      const { tenantId, userId } = await setupTestTenant()
      const draft = await invoiceService.createInvoice(tenantId, userId, {
          currency: 'USD',
          items: [{ description: 'Test', quantity: 1, unitPrice: '10.00' }]
      })

      const open = await invoiceService.issueInvoice(tenantId, draft.id)
      
      expect(open).toBeDefined()
      expect(open!.status).toBe('open')
      expect(open!.number).toBe(1) // First invoice issued
  })

  it('assigns sequential unique identifiers within specific tenants successfully', async () => {
      const { tenantId, userId } = await setupTestTenant()
      // Needs items to populate otherwise it throws error in createInvoice
      const createData = { currency: 'USD', items: [{ description: 'Item', quantity: 1, unitPrice: '1.00' }] }
      const inv1 = await invoiceService.createInvoice(tenantId, userId, createData)
      const inv2 = await invoiceService.createInvoice(tenantId, userId, createData)
      const inv3 = await invoiceService.createInvoice(tenantId, userId, createData)

      const opened1 = await invoiceService.issueInvoice(tenantId, inv1.id)
      const opened2 = await invoiceService.issueInvoice(tenantId, inv2.id)
      const opened3 = await invoiceService.issueInvoice(tenantId, inv3.id)

      expect(opened1).toBeDefined()
      expect(opened2).toBeDefined()
      expect(opened3).toBeDefined()

      expect(opened1!.number).toBe(1)
      expect(opened2!.number).toBe(2)
      expect(opened3!.number).toBe(3)
  })
})
