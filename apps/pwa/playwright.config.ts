import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.smoke.ts',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run start -- --hostname 127.0.0.1 --port 3100',
    cwd: __dirname,
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_FAKE_GENERATION: '1',
      GENERATION_JOB_STORE: 'memory',
      ANTHROPIC_API_KEY: '',
      APP_PASSWORD: '',
      NEXT_DIST_DIR: '.next-smoke',
    },
  },
});
