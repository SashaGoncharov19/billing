export interface BasePlugin {
  /**
   * Called when a subscription for this product is successfully created and paid.
   * Responsible for actually provisioning the external service.
   */
  onProvision(tenantId: string, subscriptionId: string, config: any): Promise<void>;

  /**
   * Called when a subscription fails to renew or is manually paused.
   */
  onSuspend(tenantId: string, subscriptionId: string): Promise<void>;

  /**
   * Called when a suspended subscription is paid and resumed.
   */
  onReactivate(tenantId: string, subscriptionId: string): Promise<void>;

  /**
   * Called when a subscription is permanently canceled.
   */
  onTerminate(tenantId: string, subscriptionId: string): Promise<void>;

  /**
   * Returns the available configuration options for this plugin to build the Admin UI dynamic dropdowns
   */
  getAdminOptions(): Promise<{ id: string | number, name: string }[]>;
}
