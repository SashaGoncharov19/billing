import { test, expect } from '@playwright/test'
import { resetDb } from './helpers'

test.describe('Authentication Flow', () => {
  test.beforeEach(async () => {
    // Requires exact URL in process.env, which we set in playwright config but we need to ensure tests run with it.
    process.env.DATABASE_URL = 'postgresql://entityseven:entityseven_dev@localhost:5433/entityseven_test'
    await resetDb()
  })

  test('user can register, create a tenant, and log in', async ({ page }) => {
    // Navigate to register
    await page.goto('/register')
    
    // Fill form
    await page.fill('input[name="name"]', 'Playwright User')
    await page.fill('input[name="email"]', 'playwright@entityseven.com')
    await page.fill('input[name="password"]', 'Password123!')
    await page.fill('input[name="tenantName"]', 'Playwright Corp')
    
    // Submit
    await page.click('button[type="submit"]')
    
    // Should navigate to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('text=Playwright Corp').first()).toBeVisible()

    // Logout
    await page.click('button:has-text("Logout"), a:has-text("Logout"), [aria-label="Logout"]')
    // Depending on UI, fallback:
    if (page.url().includes('dashboard')) {
        await page.goto('/logout') // or similar logout action
    }

    // Navigate to login
    await page.goto('/login')
    await page.fill('input[name="email"]', 'playwright@entityseven.com')
    await page.fill('input[name="password"]', 'Password123!')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL('/dashboard')
  })
})
