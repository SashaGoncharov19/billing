import { Elysia, t } from 'elysia'
import { authenticate } from '@api/middleware/authenticate'
import { resolveTenant } from '@api/middleware/tenant'
import { ServicesService } from './services.service'

export const servicesRouter = new Elysia({ prefix: '/v1/services' })
  .use(authenticate)
  .use(resolveTenant)
  .decorate('servicesService', new ServicesService())
  .get('/', async ({ tenant, servicesService }) => {
    return await servicesService.getServicesByTenant(tenant.id)
  })
  .post(
    '/',
    async ({ tenant, body, servicesService }) => {
      // Body takes a productId to order
      return await servicesService.orderService(tenant.id, body.productId)
    },
    {
      body: t.Object({
        productId: t.String(),
      }),
    }
  )
  .delete(
    '/:id',
    async ({ tenant, params, servicesService }) => {
      return await servicesService.deleteService(tenant.id, params.id)
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
