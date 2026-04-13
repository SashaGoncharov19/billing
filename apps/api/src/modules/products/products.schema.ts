import { t } from 'elysia'

export const CreateProductDto = t.Object({
  name: t.String(),
  description: t.Optional(t.String()),
  price: t.String(), // String representation for precise decimal
  setupFee: t.Optional(t.String()),
  currency: t.Optional(t.String({ default: 'USD' })),
  billingType: t.Union([t.Literal('one_time'), t.Literal('recurring')]),
  billingInterval: t.Optional(t.Union([t.Literal('month'), t.Literal('year')])),
})

export const UpdateProductDto = t.Partial(t.Object({
  name: t.String(),
  description: t.String(),
  price: t.String(),
  setupFee: t.String(),
  isActive: t.Boolean(),
}))
