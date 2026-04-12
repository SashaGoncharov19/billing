import { app } from '../../src'
import { treaty } from '@elysiajs/eden'
import type { App } from '../../src'

export const api = treaty<App>(app)

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}
