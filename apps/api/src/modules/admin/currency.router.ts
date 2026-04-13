import { Elysia, t } from 'elysia'
import { db, currencies } from '@entityseven/db'
import { eq, desc } from 'drizzle-orm'

export const currencyRouter = new Elysia({ prefix: '/currencies' })
  .get('/', async () => {
    return await db.select().from(currencies).orderBy(desc(currencies.isBaseCurrency))
  })
  .post('/', async ({ body }) => {
    // If making this the base currency, unset previous base
    if (body.isBaseCurrency) {
      await db.update(currencies).set({ isBaseCurrency: false })
    }

    const [newCurrency] = await db.insert(currencies).values({
      ...body,
      tenantId: body.tenantId,
    }).returning()
    return newCurrency
  }, {
    body: t.Object({
      tenantId: t.String({ format: 'uuid' }),
      code: t.String(),
      symbol: t.String(),
      exchangeRate: t.Optional(t.String()),
      isBaseCurrency: t.Optional(t.Boolean()),
      isActive: t.Optional(t.Boolean()),
    })
  })
  .patch('/:id', async ({ params: { id }, body }) => {
    if (body.isBaseCurrency) {
      await db.update(currencies).set({ isBaseCurrency: false })
    }

    const [updated] = await db.update(currencies)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(currencies.id, id))
      .returning()
    return updated
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      code: t.Optional(t.String()),
      symbol: t.Optional(t.String()),
      exchangeRate: t.Optional(t.String()),
      isBaseCurrency: t.Optional(t.Boolean()),
      isActive: t.Optional(t.Boolean()),
    })
  })
  .delete('/:id', async ({ params: { id } }) => {
    const [deleted] = await db.delete(currencies).where(eq(currencies.id, id)).returning()
    return deleted
  }, {
    params: t.Object({ id: t.String() })
  })
