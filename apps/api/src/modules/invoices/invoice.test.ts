import { describe, expect, it, mock, beforeEach } from 'bun:test'
import { InvoiceService } from './invoice.service'
import { InvalidTransitionError } from './invoice.types'

const mockInsertReturning = mock().mockResolvedValue([{ id: 'inv_123', status: 'draft' }])
const mockInsertValues = mock().mockReturnValue({ returning: mockInsertReturning })
const mockInsert = mock().mockReturnValue({ values: mockInsertValues })

const mockUpdateReturning = mock().mockResolvedValue([{ id: 'inv_123', status: 'open', number: 1 }])
const mockUpdateWhere = mock().mockReturnValue({ returning: mockUpdateReturning })
const mockUpdateSet = mock().mockReturnValue({ where: mockUpdateWhere })
const mockUpdate = mock().mockReturnValue({ set: mockUpdateSet })

const mockFindMany = mock().mockResolvedValue([{ id: 'inv_123' }])
const mockFindFirst = mock().mockResolvedValue({ id: 'inv_123', status: 'draft', tenantId: 'tenant_1', paidAmount: '0' })

mock.module('@entityseven/db', () => ({
  db: {
    query: {
      invoices: {
        findMany: mockFindMany,
        findFirst: mockFindFirst,
      },
      tenants: {
        findFirst: mock().mockResolvedValue({ id: 'tenant_1', name: 'Test' })
      }
    },
    insert: mockInsert,
    update: mockUpdate,
    transaction: mock().mockImplementation(async (cb: Function) => {
      const txMock = {
        insert: mockInsert,
        update: mockUpdate,
        query: {
          invoices: { findFirst: mockFindFirst }
        },
        select: mock().mockReturnValue({ 
          from: mock().mockReturnValue({ 
            where: mock().mockReturnValue({ 
              orderBy: mock().mockReturnValue({
                limit: mock().mockReturnValue({
                  for: mock().mockResolvedValue([{ maxNumber: 0 }]) 
                })
              })
            }) 
          }) 
        }),
      }
      return await cb(txMock)
    })
  },
  invoices: {},
  invoiceItems: {},
  tenants: {},
}))

mock.module('drizzle-orm', () => ({
  eq: mock().mockReturnValue({}),
  and: mock().mockReturnValue({}),
  desc: mock().mockReturnValue({}),
  asc: mock().mockReturnValue({}),
  sql: mock().mockReturnValue({}),
}))

const mockPdf = mock().mockResolvedValue(Buffer.from('mock pdf'))
const mockNewPage = mock().mockResolvedValue({
  setContent: mock().mockResolvedValue(undefined),
  pdf: mockPdf,
})
const mockBrowserClose = mock().mockResolvedValue(undefined)
const mockPuppeteerLaunch = mock().mockResolvedValue({
  newPage: mockNewPage,
  close: mockBrowserClose,
})

mock.module('puppeteer', () => ({
  default: {
    launch: mockPuppeteerLaunch,
  }
}))

mock.module('./invoice.pdf', () => ({
  generatePdf: mock().mockResolvedValue(Buffer.from('pdf')),
  uploadInvoicePdf: mock().mockResolvedValue('invoices/tenant_1/inv_123.pdf'),
  getInvoiceSignedUrl: mock().mockReturnValue('https://s3.signed.url/123')
}))

describe('Invoice Service', () => {
  let invoiceService: InvoiceService

  beforeEach(() => {
    invoiceService = new InvoiceService()
    mockInsertValues.mockClear()
    mockUpdateSet.mockClear()
  })

  describe('createInvoice', () => {
    it('calculates totals correctly including tax', async () => {
      const result = await invoiceService.createInvoice('tenant_1', 'user_1', {
        items: [
          { description: 'Item 1', quantity: 2, unitPrice: '10.00', taxRate: '0.10' }, // 20 + 2 tax = 22
          { description: 'Item 2', quantity: 1, unitPrice: '50.00', taxRate: '0.20' }, // 50 + 10 tax = 60
        ]
      })

      expect(result).toBeDefined()
      // Verification of internal calculation inside transaction insert args:
      const insertArgs = mockInsertValues.mock.calls[0]?.[0]
      expect(insertArgs?.subtotalAmount).toBe('70.00')
      expect(insertArgs?.taxAmount).toBe('12.00')
      expect(insertArgs?.totalAmount).toBe('82.00')
    })

    it('validates minimum 1 line item', async () => {
      await expect(invoiceService.createInvoice('t1', 'u1', { items: [] })).rejects.toThrow('Invoice must have at least 1 item')
    })

    it('creates in draft status', async () => {
      const result = await invoiceService.createInvoice('tenant_1', 'user_1', {
        items: [{ description: 'Test', quantity: 1, unitPrice: '10', taxRate: '0' }]
      })
      const insertArgs = mockInsertValues.mock.calls[0]![0]
      expect(insertArgs.status).toBe('draft')
    })
  })

  describe('issueInvoice', () => {
    it('assigns sequential number per tenant and opens invoice', async () => {
      // It sets mock maxNumber: 0, so next number should be 1
      await invoiceService.issueInvoice('tenant_1', 'inv_123')
      const updateArgs = mockUpdateSet.mock.calls[0]?.[0]

      expect(updateArgs?.status).toBe('open')
      expect(updateArgs?.number).toBe(1)
    })

    it('cannot issue already open invoice', async () => {
      mockFindFirst.mockResolvedValueOnce({ id: 'inv_123', status: 'open', tenantId: 'tenant_1' } as never)
      await expect(invoiceService.issueInvoice('tenant_1', 'inv_123')).rejects.toThrow(InvalidTransitionError)
    })
  })

  describe('state machine', () => {
    it('draft can transition to void', async () => {
      mockFindFirst.mockResolvedValueOnce({ id: 'inv_123', status: 'draft', tenantId: 'tenant_1', paidAmount: '0' } as never)
      await expect(invoiceService.voidInvoice('t1', 'inv_123')).resolves.toBeDefined()
    })

    it('paid invoice cannot be voided', async () => {
      mockFindFirst.mockResolvedValueOnce({ id: 'inv_123', status: 'paid', tenantId: 'tenant_1' } as never)
      await expect(invoiceService.voidInvoice('t1', 'inv_123')).rejects.toThrow(InvalidTransitionError)
    })

    it('cannot void invoice with partial payments', async () => {
      mockFindFirst.mockResolvedValueOnce({ id: 'inv_123', status: 'open', tenantId: 'tenant_1', paidAmount: '10.00' } as never)
      await expect(invoiceService.voidInvoice('t1', 'inv_123')).rejects.toThrow('Cannot void invoice that has payments')
    })
  })

  describe('PDF generation', () => {
    it('returns signed URL correctly', async () => {
      mockFindFirst.mockResolvedValueOnce({ id: 'inv_123', pdfUrl: 'invoices/tenant_1/inv_123.pdf' } as never)
      const url = await invoiceService.getPdfSignedUrl('tenant_1', 'inv_123')
      expect(url).toBe('https://s3.signed.url/123')
    })
  })
})
