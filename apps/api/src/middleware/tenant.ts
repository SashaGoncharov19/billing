import { Elysia } from 'elysia'
import { authenticate } from './authenticate'
import { db, tenants } from '@entityseven/db'
import { eq, and, isNull } from 'drizzle-orm'

export const resolveTenant = new Elysia({ name: 'resolve-tenant' })
  .use(authenticate)
  .derive({ as: 'scoped' }, async ({ user, status }) => {
    if (!user || !user.tenantId) {
      return status(403, { code: 'TENANT_REQUIRED', message: 'Tenant context is required' })
    }

    const tenant = await db.query.tenants.findFirst({
      where: and(eq(tenants.id, user.tenantId), isNull(tenants.deletedAt)),
    })

    if (!tenant) {
      return status(404, { code: 'TENANT_NOT_FOUND', message: 'Tenant not found or inactive' })
    }

    return { tenant }
  })
