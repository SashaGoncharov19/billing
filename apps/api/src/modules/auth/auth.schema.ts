import { t } from 'elysia'

export const AuthSchema = {
  Login: t.Object({
    email: t.String({ format: 'email' }),
    password: t.String()
  }),
  Register: t.Object({
    email: t.String({ format: 'email' }),
    password: t.String({ minLength: 8 }),
    name: t.String({ minLength: 2, maxLength: 100 })
  }),
  SwitchTenant: t.Object({
    tenantId: t.String({ format: 'uuid' })
  })
}
