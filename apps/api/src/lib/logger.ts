import pino from 'pino'

export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    app: 'entityseven-api',
    env: process.env['NODE_ENV'],
    version: process.env['APP_VERSION'] ?? '0.0.1',
  },
  ...(process.env['NODE_ENV'] !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }
  })
})
