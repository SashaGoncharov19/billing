import { Elysia } from 'elysia'
import { redis } from 'bun'
import { jwtSetup } from '../lib/jwt'

export const authenticate = new Elysia({ name: 'authenticate' })
  .use(jwtSetup)
  .derive({ as: 'scoped' }, async ({ accessJwt, headers, status }) => {
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      return status(401, { code: 'UNAUTHORIZED', message: 'Invalid or expired token' })
    }

    const token = authHeader.slice(7)
    const payload = await accessJwt.verify(token)
    
    if (!payload || !payload.sub) {
      return status(401, { code: 'TOKEN_EXPIRED', message: 'Access token expired or invalid' })
    }

    const isBlacklisted = await redis.get(`bl_token:${token}`)
    if (isBlacklisted) {
      return status(401, { code: 'UNAUTHORIZED', message: 'Token has been revoked' })
    }

    return {
      user: {
        id: payload.sub as string,
        email: payload.email as string,
        tenantId: payload.tenantId as string | undefined,
        role: payload.role as string | undefined,
      }
    }
  })
