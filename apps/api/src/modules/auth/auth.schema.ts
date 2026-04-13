import { t } from 'elysia'

export const AuthSchema = {
  Login: t.Object({
    email: t.String({ format: 'email' }),
    password: t.String()
  }),
  Register: t.Object({
    email: t.String({ format: 'email' }),
    password: t.String({ minLength: 8 }),
    tenantName: t.String({ minLength: 2, maxLength: 100 })
  }),
  SwitchTenant: t.Object({
    tenantId: t.String({ format: 'uuid' })
  }),
  UpdateMe: t.Object({
    billingName: t.Optional(t.String()),
    billingAddress: t.Optional(t.String()),
    billingTaxId: t.Optional(t.String()),
    billingEmail: t.Optional(t.String()),
    billingCountry: t.Optional(t.String()),
  })
}
