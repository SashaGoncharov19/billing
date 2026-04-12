import { Elysia, t } from 'elysia'
import { ProductsService } from './products.service'
import { CreateProductDto, UpdateProductDto } from './products.schema'
import { authenticate } from '../../middleware/authenticate'
import { resolveTenant } from '../../middleware/tenant'

export const productsRouter = new Elysia({ prefix: '/products' })
  .use(authenticate)
  .use(resolveTenant)
  .decorate('productsService', new ProductsService())
  // List products
  .get('/', async ({ tenant, productsService }) => {
    return productsService.listProducts(tenant.id)
  })
  // Admin only implicitly for write operations per specs
  .post('/', async ({ body, tenant, productsService, user, set }) => {
    if (user.role !== 'admin') {
      set.status = 403
      return { code: 'FORBIDDEN', message: 'Only admins can create products' }
    }
    return productsService.createProduct(tenant.id, body)
  }, { body: CreateProductDto })
  .patch('/:id', async ({ params: { id }, body, tenant, productsService, user, set }) => {
    if (user.role !== 'admin') {
      set.status = 403
      return { code: 'FORBIDDEN', message: 'Only admins can update products' }
    }
    return productsService.updateProduct(tenant.id, id, body)
  }, { body: UpdateProductDto, params: t.Object({ id: t.String() }) })
  .delete('/:id', async ({ params: { id }, tenant, productsService, user, set }) => {
    if (user.role !== 'admin') {
      set.status = 403
      return { code: 'FORBIDDEN', message: 'Only admins can delete products' }
    }
    return productsService.deleteProduct(tenant.id, id)
  }, { params: t.Object({ id: t.String() }) })
