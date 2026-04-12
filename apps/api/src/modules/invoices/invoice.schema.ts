import { t } from 'elysia'

export const InvoiceItemDto = t.Object({
  description: t.String(),
  quantity: t.Number({ minimum: 1 }),
  unitPrice: t.String(), // String representation for precise decimal, e.g. "99.00"
  taxRate: t.String(),   // "0.20" for 20%
  productId: t.Optional(t.String()),
})

export const CreateInvoiceDto = t.Object({
  currency: t.Optional(t.String({ default: 'USD' })),
  dueAt: t.Optional(t.String()), // ISO date string
  notes: t.Optional(t.String()),
  items: t.Array(InvoiceItemDto, { minItems: 1 }),
})

export const UpdateInvoiceDto = t.Partial(CreateInvoiceDto)

export const QueryInvoicesDto = t.Object({
  status: t.Optional(t.Union([
    t.Literal('draft'), 
    t.Literal('open'), 
    t.Literal('paid'), 
    t.Literal('void'), 
    t.Literal('uncollectible')
  ])),
  cursor: t.Optional(t.String()),
  limit: t.Optional(t.Numeric({ default: 20, maximum: 100 }))
})
