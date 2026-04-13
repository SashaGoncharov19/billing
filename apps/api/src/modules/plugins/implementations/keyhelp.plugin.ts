import type { BasePlugin } from '../plugin.interface'
import { db, tenants, memberships, users, subscriptions } from '@entityseven/db'
import { eq, and } from 'drizzle-orm'
import { emailQueue } from '../../../queue'
import crypto from 'crypto'

export class KeyhelpPlugin implements BasePlugin {
  private getApiConfig() {
    const apiUrl = process.env.KEYHELP_API_URL || 'https://cp.entityseven.com/api/v2'
    const apiKey = process.env.KEYHELP_API_KEY
    if (!apiKey) throw new Error('KEYHELP_API_KEY is not configured')
    return { apiUrl, apiKey }
  }

  private generatePassword(): string {
    return crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16) + 'Aa1!'
  }

  private async fetchKeyhelp(endpoint: string, method: string, body?: any) {
    const { apiUrl, apiKey } = this.getApiConfig()
    
    const requestInit: RequestInit = {
      method,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    }
    if (body) {
      requestInit.body = JSON.stringify(body)
    }

    const res = await fetch(`${apiUrl}${endpoint}`, requestInit)

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Keyhelp API Error [${res.status}]: ${text}`)
    }

    // DELETE requests and sometimes PUT requests return 204 No Content
    if (res.status === 204) return null;
    
    return res.json()
  }

  private async getTenantEmail(tenantId: string) {
    // Attempt to get the owner's email
    const result = await db.select({ email: users.email })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.role, 'owner')))
      .limit(1)

    return result[0]?.email
  }

  async onProvision(tenantId: string, subscriptionId: string, config: any): Promise<void> {
    console.log(`[Plugin:KeyHelp] PROVISION called for Tenant ${tenantId}, Sub ${subscriptionId}`)
    
    const planId = config?.hostingPlanId
    if (!planId) throw new Error('Keyhelp plugin config missing hostingPlanId')

    const email = await this.getTenantEmail(tenantId)
    if (!email) throw new Error('Cannot provision Keyhelp: Tenant has no owner email')

    const safeTenantSuffix = tenantId.replace(/-/g, '').substring(0, 8)
    const username = `e7_${safeTenantSuffix}`
    const password = this.generatePassword()

    const payload = {
      username,
      email,
      password,
      id_hosting_plan: Number(planId),
      send_login_credentials: false,
      create_system_domain: true
    }

    console.log(`[Plugin:KeyHelp] Creating Keyhelp client...`, { username, email, planId })

    const response = await this.fetchKeyhelp('/clients', 'POST', payload)
    
    // Keyhelp returns the created client ID in `id` usually or a full object
    const clientId = response?.id || response?.data?.id
    
    if (!clientId) {
       console.warn(`[Plugin:KeyHelp] Unrecognized response format from POST /clients`, response)
       // Let it proceed to email generation, worst case we don't have the ID saved perfectly
    }

    // Save metadata
    await db.update(subscriptions)
      .set({
        providerData: {
          keyhelpClientId: clientId,
          username
        }
      })
      .where(eq(subscriptions.id, subscriptionId))

    // Queue email
    const subject = 'Your Web Hosting Account is Ready!'
    const textBody = `
Hello!

Your hosting account has been successfully provisioned. Here are your details:

Control Panel: ${this.getApiConfig().apiUrl.replace('/api/v2', '')}
Username: ${username}
Password: ${password}

Please log in and change your password as soon as possible!

- Entity Seven Automated Billing
    `.trim()

    await emailQueue.add('send-email', {
      to: email,
      subject,
      body: textBody
    })
    
    console.log(`[Plugin:KeyHelp] Provisioning successful! Dispatched email.`)
  }

  async onSuspend(tenantId: string, subscriptionId: string): Promise<void> {
    console.log(`[Plugin:KeyHelp] SUSPEND called for Tenant ${tenantId}, Sub ${subscriptionId}`)
    
    const sub = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.id, subscriptionId)
    })
    
    const providerData = sub?.providerData as any
    const clientId = providerData?.keyhelpClientId
    
    if (!clientId) {
      console.error(`[Plugin:KeyHelp] Cannot suspend: No keyhelpClientId found for sub ${subscriptionId}`)
      return
    }

    await this.fetchKeyhelp(`/clients/${clientId}`, 'PUT', {
      suspend_account: true
    })
    console.log(`[Plugin:KeyHelp] Client ${clientId} suspended.`)
  }

  async onReactivate(tenantId: string, subscriptionId: string): Promise<void> {
    console.log(`[Plugin:KeyHelp] REACTIVATE called for Sub ${subscriptionId}`)

    const sub = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.id, subscriptionId)
    })
    
    const providerData = sub?.providerData as any
    const clientId = providerData?.keyhelpClientId
    
    if (!clientId) {
      console.error(`[Plugin:KeyHelp] Cannot reactivate: No keyhelpClientId found for sub ${subscriptionId}`)
      return
    }

    await this.fetchKeyhelp(`/clients/${clientId}`, 'PUT', {
      suspend_account: false
    })
    console.log(`[Plugin:KeyHelp] Client ${clientId} reactivated.`)
  }

  async onTerminate(tenantId: string, subscriptionId: string): Promise<void> {
    console.log(`[Plugin:KeyHelp] TERMINATE called for Sub ${subscriptionId}`)

    const sub = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.id, subscriptionId)
    })
    
    const providerData = sub?.providerData as any
    const clientId = providerData?.keyhelpClientId
    
    if (!clientId) {
      console.error(`[Plugin:KeyHelp] Cannot terminate: No keyhelpClientId found`)
      return
    }

    await this.fetchKeyhelp(`/clients/${clientId}`, 'DELETE')
    console.log(`[Plugin:KeyHelp] Client ${clientId} DELETED.`)
  }

  async getAdminOptions(): Promise<{ id: string | number; name: string }[]> {
    try {
      const response = await this.fetchKeyhelp('/hosting-plans', 'GET')
      // Keyhelp typically returns an array of plans or { data: [...] }
      const plans = Array.isArray(response) ? response : response?.data || []
      
      return plans.map((plan: any) => ({
        id: plan.id,
        name: plan.name || `Plan ${plan.id}`
      }))
    } catch (e) {
      console.error('[Plugin:KeyHelp] Error fetching admin options:', e)
      return []
    }
  }
}
