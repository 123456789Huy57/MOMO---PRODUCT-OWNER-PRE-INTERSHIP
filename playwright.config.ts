import { defineConfig } from '@playwright/test';

// Acceptance tests for US01-US10 (Part 2, Table 7.3). Runs against a production build.
// Uses the Chrome installed on the machine; set CHROME_PATH to point at another binary.
export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  timeout: 60_000,
  reporter: [['list'], ['json', { outputFile: 'sim/out/acceptance.json' }]],
  use: {
    baseURL: 'http://localhost:3100',
    viewport: { width: 390, height: 844 },
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' },
  },
  webServer: { command: 'npx next start -p 3100', url: 'http://localhost:3100/api/health', reuseExistingServer: true, timeout: 120_000 },
});
