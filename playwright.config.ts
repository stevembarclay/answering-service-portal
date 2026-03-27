import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
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
      // auth-tests must complete first: the Supabase project enforces a single
      // active session per user, so each new login invalidates prior sessions.
      // Running setup after auth-tests ensures the saved auth state is fresh.
      dependencies: ['auth-tests'],
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
