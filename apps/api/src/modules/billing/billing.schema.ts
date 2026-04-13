import { t } from 'elysia'

export const CheckoutDto = t.Object({
  items: t.Array(t.Object({
    productId: t.String(),
    quantity: t.Numeric()
  })),
  successUrl: t.String(),
  cancelUrl: t.String(),
})

export const PortalDto = t.Object({
  returnUrl: t.String(),
})
