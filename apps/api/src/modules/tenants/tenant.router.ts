import { Elysia, t } from 'elysia'
import { tenantService } from './tenant.service'
import { resolveTenant } from '@api/middleware/tenant'
import { authenticate } from '@api/middleware/authenticate'
import {
  createTenantSchema,
  updateTenantSchema,
  uploadLogoSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from './tenant.schema'

export const tenantRouter = new Elysia({ prefix: '/tenants', name: 'tenant.router' })
  .use(authenticate)
  // Endpoint to create a new tenant (No tenant context needed yet)
  .post(
    '/',
    async ({ body, user, status }) => {
      try {
        if (!user?.id) return status(401, { message: 'Unauthorized' })
        const data = await tenantService.createTenant(user.id, body)
        return status(201, data)
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        return status(400, { message: msg })
      }
    },
    {
      body: createTenantSchema,
    },
  )
  // Protect /current routes with tenant resolution
  .use(resolveTenant)
  .get('/current', ({ tenant }) => {
    return tenant
  })
  .patch(
    '/current',
    async ({ body, tenant, status }) => {
      try {
        if (!tenant?.id) return status(400, { message: 'Tenant context missing' })
        return tenantService.updateTenant(tenant.id, body)
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        return status(400, { message: msg })
      }
    },
    {
      body: updateTenantSchema,
    },
  )
  .post(
    '/current/logo',
    async ({ body, tenant, status }) => {
      try {
        if (!tenant?.id) return status(400, { message: 'Tenant context missing' })
        return tenantService.uploadLogo(tenant.id, body.logo)
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        return status(400, { message: msg })
      }
    },
    {
      body: uploadLogoSchema,
    },
  )
  .get('/current/members', async ({ tenant, status }) => {
    if (!tenant?.id) return status(400, { message: 'Tenant context missing' })
    const members = await tenantService.getMembers(tenant.id)
    return {
      data: members,
      pagination: { total: members.length, page: 1, pageSize: members.length },
    }
  })
  .post(
    '/current/members/invite',
    async ({ body, tenant, status }) => {
      try {
        if (!tenant?.id) return status(400, { message: 'Tenant context missing' })
        return await tenantService.inviteMember(
          tenant.id,
          body.email,
          body.role as 'admin' | 'member',
        )
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        return status(400, { message: msg })
      }
    },
    {
      body: inviteMemberSchema,
    },
  )
  .patch(
    '/current/members/:memberId',
    async ({ body, tenant, params, status }) => {
      try {
        if (!tenant?.id) return status(400, { message: 'Tenant context missing' })
        return tenantService.updateMemberRole(
          tenant.id,
          params.memberId,
          body.role as 'admin' | 'member',
        )
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        return status(400, { message: msg })
      }
    },
    {
      body: updateMemberRoleSchema,
      params: t.Object({ memberId: t.String() }),
    },
  )
  .delete(
    '/current/members/:memberId',
    async ({ tenant, params, status }) => {
      try {
        if (!tenant?.id) return status(400, { message: 'Tenant context missing' })
        await tenantService.removeMember(tenant.id, params.memberId)
        return status(200, { success: true })
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        return status(400, { message: msg })
      }
    },
    {
      params: t.Object({ memberId: t.String() }),
    },
  )
