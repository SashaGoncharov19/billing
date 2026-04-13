import { t } from 'elysia'

export const createTenantSchema = t.Object({
  name: t.String({ minLength: 2, maxLength: 255 }),
  slug: t.String({ minLength: 2, maxLength: 100 }), // can add regex to restrict to url-safe later
})

export const updateTenantSchema = t.Object({
  name: t.Optional(t.String({ minLength: 2, maxLength: 255 })),
  primaryColor: t.Optional(t.String({ pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$' })),
  secondaryColor: t.Optional(t.String({ pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$' })),
  billingEntity: t.Optional(t.String()),
  billingAddress: t.Optional(t.String()),
  billingTaxId: t.Optional(t.String()),
  billingEmail: t.Optional(t.String()),
  billingCountry: t.Optional(t.String()),
})

export const uploadLogoSchema = t.Object({
  logo: t.File({
    type: ['image/png', 'image/jpeg', 'image/svg+xml'],
    maxSize: 5 * 1024 * 1024 // 5MB
  })
})

export const inviteMemberSchema = t.Object({
  email: t.String({ format: 'email' }),
  role: t.Union([t.Literal('admin'), t.Literal('member')], { default: 'member' })
})

export const updateMemberRoleSchema = t.Object({
  role: t.Union([t.Literal('admin'), t.Literal('member')])
})
