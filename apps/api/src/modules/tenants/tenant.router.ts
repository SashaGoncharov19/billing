import { Elysia, t } from 'elysia'
import { tenantService } from './tenant.service'
import { resolveTenant } from '../../middleware/tenant'
import { authenticate } from '../../middleware/authenticate'
import { 
  createTenantSchema, updateTenantSchema,
  uploadLogoSchema, inviteMemberSchema, updateMemberRoleSchema
} from './tenant.schema'

export const tenantRouter = new Elysia({ prefix: '/api/v1/tenants', name: 'tenant.router' })
  .use(authenticate)
  // Endpoint to create a new tenant (No tenant context needed yet)
  .post('/', async ({ body, user, set }) => {
    try {
      if (!user?.id) {
        set.status = 401
        return { message: 'Unauthorized' }
      }
      const data = await tenantService.createTenant(user.id, body)
      set.status = 201
      return data
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      set.status = 400
      return { message: msg }
    }
  }, {
    body: createTenantSchema
  })
  // Protect /current routes with tenant resolution
  .use(resolveTenant)
  .get('/current', ({ tenant }) => {
    return tenant
  })
  .patch('/current', async ({ body, tenant, set }) => {
    try {
      if (!tenant?.id) {
        set.status = 400
        return { message: 'Tenant context missing' }
      }
      return await tenantService.updateTenant(tenant.id, body)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      set.status = 400
      return { message: msg }
    }
  }, {
    body: updateTenantSchema
  })
  .post('/current/logo', async ({ body, tenant, set }) => {
    try {
      if (!tenant?.id) {
        set.status = 400
        return { message: 'Tenant context missing' }
      }
      return await tenantService.uploadLogo(tenant.id, body.logo)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      set.status = 400
      return { message: msg }
    }
  }, {
    body: uploadLogoSchema
  })
  .get('/current/members', async ({ tenant, set }) => {
    if (!tenant?.id) {
      set.status = 400
      return { message: 'Tenant context missing' }
    }
    const members = await tenantService.getMembers(tenant.id)
    return { data: members, pagination: { total: members.length, page: 1, pageSize: members.length } }
  })
  .post('/current/members/invite', async ({ body, tenant, set }) => {
    try {
      if (!tenant?.id) {
        set.status = 400
        return { message: 'Tenant context missing' }
      }
      return await tenantService.inviteMember(tenant.id, body.email, body.role as 'admin' | 'member')
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      set.status = 400
      return { message: msg }
    }
  }, {
    body: inviteMemberSchema
  })
  .patch('/current/members/:memberId', async ({ body, tenant, params, set }) => {
    try {
      if (!tenant?.id) {
        set.status = 400
        return { message: 'Tenant context missing' }
      }
      return await tenantService.updateMemberRole(tenant.id, params.memberId, body.role as 'admin' | 'member')
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      set.status = 400
      return { message: msg }
    }
  }, {
    body: updateMemberRoleSchema,
    params: t.Object({ memberId: t.String() })
  })
  .delete('/current/members/:memberId', async ({ tenant, params, set }) => {
    try {
      if (!tenant?.id) {
        set.status = 400
        return { message: 'Tenant context missing' }
      }
      await tenantService.removeMember(tenant.id, params.memberId)
      return { success: true }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      set.status = 400
      return { message: msg }
    }
  }, {
    params: t.Object({ memberId: t.String() })
  })
