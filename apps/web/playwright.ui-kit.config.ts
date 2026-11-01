import { defineConfig, devices } from '@playwright/test';

/** Fast loop for UI work: only the dev server and the UI kit spec (no database or API). */
const port = 5174;

export default defineConfig({
  testDir: './e2e',
  testMatch: /ui-kit(-[\w-]+)?\.spec\.ts/,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { ...devices['Pixel 7'], baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: `pnpm exec vite --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
