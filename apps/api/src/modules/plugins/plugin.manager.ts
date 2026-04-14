import type { BasePlugin } from './plugin.interface'
import { KeyhelpPlugin } from './implementations/keyhelp.plugin'

type EventType = 'provision' | 'suspend' | 'reactivate' | 'terminate'

class PluginManagerClass {
  private registry: Map<string, BasePlugin> = new Map()

  constructor() {
    this.registry.set('keyhelp', new KeyhelpPlugin())
    // Additional plugins can be registered here in the future
  }

  getPlugin(pluginType: string): BasePlugin | undefined {
    return this.registry.get(pluginType)
  }

  getRegisteredPlugins(): { id: string; name: string }[] {
    return [
      { id: 'keyhelp', name: 'KeyHelp' },
      // In the future this can be dynamically generated or read from this.registry keys
    ]
  }

  async dispatch(
    event: EventType,
    pluginType: string,
    tenantId: string,
    subscriptionId: string,
    config?: any,
  ) {
    const plugin = this.getPlugin(pluginType)
    if (!plugin) {
      console.warn(`[PluginManager] No plugin registered for type: ${pluginType}`)
      return
    }

    try {
      switch (event) {
        case 'provision':
          await plugin.onProvision(tenantId, subscriptionId, config)
          break
        case 'suspend':
          await plugin.onSuspend(tenantId, subscriptionId)
          break
        case 'reactivate':
          await plugin.onReactivate(tenantId, subscriptionId)
          break
        case 'terminate':
          await plugin.onTerminate(tenantId, subscriptionId)
          break
      }
    } catch (error) {
      console.error(`[PluginManager] Error dispatching ${event} to plugin ${pluginType}:`, error)
      // Throwing so the caller (or webhook worker) knows the plugin hook failed
      throw error
    }
  }
}

export const PluginManager = new PluginManagerClass()
