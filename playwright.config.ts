import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'screenshots',
      testMatch: '**/capture-screenshots.e2e.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
      use: { ...devices['Desktop Chrome'] },
      // No dependency on auth-tests: auth.setup.ts skips login when auth files
      // are still fresh (< 6 h old). Run auth-tests explicitly when you need to
      // exercise the login/logout flows — they would otherwise invalidate the
      // saved sessions before setup can write fresh ones.
    },
    {
      name: 'auth-tests',
      testMatch: '**/auth.e2e.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'client-tests',
      testMatch: 'tests/e2e/client/**/*.e2e.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/client.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'operator-tests',
      testMatch: 'tests/e2e/operator/**/*.e2e.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/operator.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'api-tests',
      testMatch: '**/api.e2e.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/operator.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'visual-qa',
      testMatch: '**/visual-qa.e2e.ts',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
})
