import { Elysia, t } from 'elysia'
import { db, products, paymentMethods, currencies } from '@entityseven/db'
import { eq, isNull, desc } from 'drizzle-orm'
import { authenticate } from '../../middleware/authenticate'
import { resolveTenant } from '../../middleware/tenant'

export const storeRouter = new Elysia({ prefix: '/store', name: 'store.router' })
  .use(authenticate)
  .use(resolveTenant)
  .get('/products', async () => {
    // Currently fetching global active products.
    // In many SaaS logic, if products are created by admins, they may belong to a "system admin" tenant or 
    // are shared. Here we just fetch all non-deleted products for display in the global store.
    // Assuming products are visible to everyone.
    return db.select()
      .from(products)
      .where(isNull(products.deletedAt))
      .orderBy(desc(products.createdAt))
  })
  .get('/products/:id', async ({ params: { id } }) => {
    const product = await db.query.products.findFirst({
      where: eq(products.id, id)
    })
    
    if (!product) {
      throw new Error('Product not found')
    }
    
    return product
  }, { params: t.Object({ id: t.String() }) })
  .get('/payment-methods', async () => {
    return await db.select()
      .from(paymentMethods)
      .where(eq(paymentMethods.isActive, true))
  })
  .get('/currencies', async () => {
    return await db.select()
      .from(currencies)
      .where(eq(currencies.isActive, true))
  })
