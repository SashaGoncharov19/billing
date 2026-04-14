import { Elysia } from 'elysia'
import { semver } from 'bun'
import pkg from '../../package.json'

export const apiVersionMiddleware = new Elysia({ name: 'api-version' })
  .derive({ as: 'global' }, ({ headers }) => ({
    // Беремо версію з хедера або fallback на поточну версію бекенда
    clientApiVersion: headers['x-api-version'] || pkg.version,
  }))
  .onBeforeHandle({ as: 'global' }, ({ headers, set }) => {
    const clientVersion = headers['x-api-version']

    // Якщо клієнт явно передає версію, валідуємо її через bun:semver
    if (clientVersion) {
      const minSupported = '>=1.0.0'
      if (!semver.satisfies(clientVersion, minSupported)) {
        set.status = 400
        return {
          code: 'UNSUPPORTED_VERSION',
          message: `Your API version (${clientVersion}) is no longer supported. Please upgrade. Minimum required: ${minSupported}`,
        }
      }
    }
  })
