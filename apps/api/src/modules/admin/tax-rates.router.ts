import { Elysia, t } from 'elysia'
import { db, taxRates } from '@entityseven/db'
import { eq, and } from 'drizzle-orm'
import { resolveTenant } from '@api/middleware/tenant'

export const taxRatesRouter = new Elysia({ prefix: '/taxes' })
  .use(resolveTenant)
  .get('/', async ({ tenant }) => {
    return db.query.taxRates.findMany({
      where: eq(taxRates.tenantId, tenant.id),
      orderBy: (taxRates, { desc }) => [desc(taxRates.createdAt)],
    })
  })
  .post(
    '/',
    async ({ body, tenant }) => {
      const [newTaxRate] = await db
        .insert(taxRates)
        .values({
          tenantId: tenant.id,
          countryCode: body.countryCode.toUpperCase(),
          taxRate: (Number(body.taxRate) / 100).toFixed(4), // store as decimal
        })
        .returning()
      return newTaxRate
    },
    {
      body: t.Object({
        countryCode: t.String(),
        taxRate: t.Numeric(),
      }),
    },
  )
  .delete(
    '/:id',
    async ({ params: { id }, tenant }) => {
      await db.delete(taxRates).where(and(eq(taxRates.id, id), eq(taxRates.tenantId, tenant.id)))
      return { success: true }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
    },
  )
