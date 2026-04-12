import { defineConfig, devices } from '@playwright/test'
import * as path from 'path'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3002', // Web running on 3002
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'bun run --cwd ../api dev --port=3001',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: '3001',
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://entityseven:entityseven_dev@localhost:5433/entityseven_test',
        REDIS_URL: 'redis://localhost:6380',
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_123'
      }
    },
    {
      command: 'bun run dev --port=3002',
      url: 'http://localhost:3002',
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: '3002',
        NODE_ENV: 'test',
        NEXT_PUBLIC_API_URL: 'http://localhost:3001/api/v1'
      }
    }
  ],
})
