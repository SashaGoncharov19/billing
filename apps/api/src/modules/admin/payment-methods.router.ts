import { Elysia, t } from 'elysia'
import { db, paymentMethods } from '@entityseven/db'
import { eq, desc } from 'drizzle-orm'

export const paymentMethodsRouter = new Elysia({ prefix: '/payment-methods' })
  .get('/', async () => {
    return db.select().from(paymentMethods).orderBy(desc(paymentMethods.createdAt))
  })
  .post(
    '/',
    async ({ body }) => {
      const [newMethod] = await db
        .insert(paymentMethods)
        .values({
          ...body,
          tenantId: body.tenantId,
        })
        .returning()
      return newMethod
    },
    {
      body: t.Object({
        tenantId: t.String({ format: 'uuid' }),
        name: t.String(),
        identifier: t.String(),
        type: t.Union([t.Literal('gateway'), t.Literal('manual')]),
        instructions: t.Optional(t.String()),
        config: t.Optional(t.Unknown()),
        isActive: t.Optional(t.Boolean()),
      }),
    },
  )
  .patch(
    '/:id',
    async ({ params: { id }, body }) => {
      const [updated] = await db
        .update(paymentMethods)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(paymentMethods.id, id))
        .returning()
      return updated
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String()),
        identifier: t.Optional(t.String()),
        type: t.Optional(t.Union([t.Literal('gateway'), t.Literal('manual')])),
        instructions: t.Optional(t.String()),
        config: t.Optional(t.Unknown()),
        isActive: t.Optional(t.Boolean()),
      }),
    },
  )
  .delete(
    '/:id',
    async ({ params: { id } }) => {
      const [deleted] = await db.delete(paymentMethods).where(eq(paymentMethods.id, id)).returning()
      return deleted
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )
