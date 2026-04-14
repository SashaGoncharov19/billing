import { Elysia } from 'elysia'

export const requestIdMiddleware = new Elysia({ name: 'request-id' })
  .derive({ as: 'global' }, ({ headers }) => ({
    requestId: headers['x-request-id'] ?? crypto.randomUUID(),
  }))
  .onAfterHandle({ as: 'global' }, ({ set, requestId }) => {
    set.headers['X-Request-Id'] = requestId as string
  })
