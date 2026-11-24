import { defineConfig, devices } from '@playwright/test'

const port = process.env.E2E_PORT ?? '4173'
const url = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: url,
    launchOptions: process.env.PARCEL_TEST_SINGLE_PROCESS ? { args: ['--single-process'] } : {},
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url,
    reuseExistingServer: !process.env.CI,
  },
})
