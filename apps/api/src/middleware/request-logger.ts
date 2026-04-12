import { Elysia } from 'elysia'
import { logger } from '../lib/logger'
import { recordRequest } from '../lib/metrics'

export const requestLogger = new Elysia({ name: 'request-logger' })
  .derive(({ request }) => {
    const url = new URL(request.url)
    const requestId = request.headers.get('x-request-id') ?? 'unknown'
    
    logger.info({
      requestId,
      method: request.method,
      path: url.pathname,
      query: url.search,
    }, 'Request received')

    return {
      startTime: Date.now(),
      requestUrl: url,
      reqId: requestId
    }
  })
  .onAfterHandle(({ request, set, startTime, requestUrl, reqId }) => {
    const duration = Date.now() - startTime

    if (requestUrl.pathname !== '/docs' && requestUrl.pathname !== '/health' && requestUrl.pathname !== '/metrics') {
      logger.info({
        requestId: reqId,
        method: request.method,
        path: requestUrl.pathname,
        status: set.status ?? 200,
        duration,
      }, 'Request completed')

      recordRequest(duration, set.status !== undefined && Number(set.status) >= 400)
    }
  })
  .onError(({ request, error }) => {
    const url = new URL(request.url)
    const requestId = request.headers.get('x-request-id') ?? 'unknown'
    const err = error as Error & { message?: string, stack?: string }
    
    logger.error({
      requestId,
      method: request.method,
      path: url.pathname,
      error: err.message ?? 'Unknown error',
      stack: err.stack,
    }, 'Request failed')
  })
