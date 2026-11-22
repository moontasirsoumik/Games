import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173/Games/super-tic-tac-toe-web/';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 120_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
    viewport: { width: 390, height: 844 },
  },
  projects: [{ name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173',
        url: 'http://127.0.0.1:4173/Games/super-tic-tac-toe-web/',
        reuseExistingServer: !process.env.CI,
        cwd: rootDir,
        env: { VITE_BASE_PATH: '/Games/super-tic-tac-toe-web/' },
      },
});