import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', testIgnore: /perf\.spec/, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testIgnore: /perf\.spec/, use: { ...devices['Desktop Firefox'] } },
    {
      name: 'perf',
      testMatch: /perf\.spec/,
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
