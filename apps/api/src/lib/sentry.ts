import * as Sentry from '@sentry/bun'

if (process.env['SENTRY_DSN'] && process.env['NODE_ENV'] === 'production') {
  Sentry.init({
    dsn: process.env['SENTRY_DSN'],
    environment: process.env['NODE_ENV'],
    release: process.env['APP_VERSION'],
    tracesSampleRate: 0.1,  // 10% trace sampling
    beforeSend(event) {
      if (event.request?.data) {
        // Redact personal and sensitive data
        delete (event.request.data as any).password
        delete (event.request.data as any).cardNumber
      }
      return event
    },
  })
}

export function captureException(error: Error, context?: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value)
      })
    }
    Sentry.captureException(error)
  })
}
