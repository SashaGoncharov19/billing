import { test, expect } from '@playwright/test'
import { resetDb } from './helpers'

test.describe('Invoice Flow', () => {
  test.beforeEach(async ({ page }) => {
    process.env.DATABASE_URL = 'postgresql://entityseven:entityseven_dev@localhost:5433/entityseven_test'
    await resetDb()

    // Register a user first to have a dashboard
    await page.goto('/register')
    await page.fill('input[name="name"]', 'Invoice User')
    await page.fill('input[name="email"]', 'invoices@entityseven.com')
    await page.fill('input[name="password"]', 'Password123!')
    await page.fill('input[name="tenantName"]', 'Invoice Corp')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('user can create and issue an invoice', async ({ page }) => {
    // Navigate to Invoices
    await page.goto('/dashboard/invoices')
    
    // Create new invoice
    await page.click('text="Create Invoice", a[href="/dashboard/invoices/new"]')
    await expect(page).toHaveURL('/dashboard/invoices/new')

    // Fill invoice items
    await page.fill('input[name="items.0.description"]', 'Consulting')
    await page.fill('input[name="items.0.quantity"]', '10')
    await page.fill('input[name="items.0.unitPrice"]', '150')
    
    // Save as draft
    await page.click('button[type="submit"]:has-text("Draft"), button:has-text("Save")')
    
    // Assert redirect to invoice details or list showing draft
    await expect(page).toHaveURL(/\/dashboard\/invoices(\/.*)?/)
    await expect(page.locator('text=draft').first()).toBeVisible()

    // Issue invoice
    await page.click('button:has-text("Issue")')
    await expect(page.locator('text=open').first()).toBeVisible()
  })
})
