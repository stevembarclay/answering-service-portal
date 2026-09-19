import { defineConfig, devices } from '@playwright/test'

/**
 * Demo recording config.
 *
 * Usage:
 *   PLAYWRIGHT_BASE_URL=https://your-staging.vercel.app npm run test:demo
 *
 * Videos land in demo-recordings/<project>/<test-title>/video.webm
 */
export default defineConfig({
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'demo-recordings/report' }]],
  timeout: 120_000,
  outputDir: 'demo-recordings',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001',
    headless: false,
    launchOptions: { slowMo: 700 },
    viewport: { width: 1440, height: 900 },
    video: 'on',
    screenshot: 'on',
    trace: 'off',
  },
  projects: [
    {
      name: 'operator-demo',
      testMatch: '**/demo/operator-demo.e2e.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        storageState: '.auth/operator.json',
      },
    },
    {
      name: 'client-demo',
      testMatch: '**/demo/client-demo.e2e.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        storageState: '.auth/client.json',
      },
    },
  ],
})
