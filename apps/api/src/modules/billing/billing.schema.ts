import { t } from 'elysia'

export const CheckoutDto = t.Object({
  productId: t.String(),
  successUrl: t.String(),
  cancelUrl: t.String(),
})

export const PortalDto = t.Object({
  returnUrl: t.String(),
})
