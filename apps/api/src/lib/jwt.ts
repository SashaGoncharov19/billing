import { jwt } from '@elysiajs/jwt'
import { Elysia } from 'elysia'

export const jwtSetup = new Elysia({ name: 'jwt-setup' })
  .use(
    jwt({
      name: 'accessJwt',
      secret: process.env.JWT_SECRET || 'fallback-secret',
      exp: '15m'
    })
  )
  .use(
    jwt({
      name: 'refreshJwt',
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-refresh-secret',
      exp: '7d'
    })
  )

export interface AccessTokenPayload {
  sub: string
  email: string
  tenantId?: string
  role?: string
}
