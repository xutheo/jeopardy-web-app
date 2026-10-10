import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/pages.spec.ts', timeout: 30000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:3201', channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true },
  webServer: [
    { command: 'npm start', url: 'http://127.0.0.1:3199/api/health', env: { PORT: '3199', DATA_DIR: '.e2e-data', ALLOWED_ORIGINS: 'http://127.0.0.1:3201' }, reuseExistingServer: false },
    { command: 'node tests/pages-server.mjs', url: 'http://127.0.0.1:3201/quiz/', reuseExistingServer: false }
  ]
});
