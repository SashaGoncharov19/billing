import { Elysia } from 'elysia'
import { redis } from 'bun'

export const loginRateLimiter = new Elysia({ name: 'login-rate-limiter' })
  .derive({ as: 'scoped' }, async ({ server, request, status }) => {
    if (process.env.NODE_ENV === 'test') return {}
    const ip = server?.requestIP(request)?.address || '127.0.0.1'
    const key = `ratelimit:login:${ip}`

    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, 900) // 15 mins window
    }

    if (count > 5) {
      const ttl = await redis.ttl(key)
      return status(429, {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later',
        details: { retryAfter: ttl }
      })
    }
    return {}
  })
