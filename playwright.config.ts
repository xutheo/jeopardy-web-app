import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/browser.spec.ts', timeout: 90000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:3199', channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true, viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm start', url: 'http://127.0.0.1:3199/api/health', env: { PORT: '3199', DATA_DIR: '.e2e-data' }, reuseExistingServer: false, timeout: 30000 }
});
