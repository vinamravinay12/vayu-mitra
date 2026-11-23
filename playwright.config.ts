import { defineConfig, devices } from '@playwright/test';

/** Port the production build is served on during e2e runs. */
const E2E_PORT = 4173;

/**
 * Real-browser checks against the production build, served with the production security
 * headers (CSP included), real email-and-password accounts and no Gemini key, so CI needs no
 * secrets. Accounts live in the server's memory, so tests run one at a time on one server.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${String(E2E_PORT)}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-375', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } } },
  ],
  webServer: {
    // Builds everything, then serves the production client with the production
    // security headers, accounts on, no Gemini key (the engine answers) and fixture air data.
    command: 'npm run start:e2e',
    url: `http://localhost:${String(E2E_PORT)}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { PORT: String(E2E_PORT) },
  },
});
