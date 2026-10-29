import { defineConfig, devices } from '@playwright/test';

/**
 * Seam 3: phone-sized browser journeys. Against a deployed preview set `PLAYWRIGHT_BASE_URL`;
 * otherwise a local stack (dev Postgres + API + built web) is started.
 */
const remote = process.env.PLAYWRIGHT_BASE_URL;
const dbPort = 54330;
const apiPort = 8788;
const webPort = 4173;
const databaseUrl = `postgres://stamina:stamina@127.0.0.1:${dbPort}/stamina`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: remote ?? `http://127.0.0.1:${webPort}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'phone', use: { ...devices['Pixel 7'] } }],
  ...(remote
    ? {}
    : {
        webServer: [
          {
            command: 'pnpm --filter @stamina/api db:dev',
            env: { DEV_DB_PORT: String(dbPort) },
            port: dbPort,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
          {
            command: 'pnpm --filter @stamina/api exec tsx src/main.node.ts',
            env: {
              PORT: String(apiPort),
              DATABASE_URL: databaseUrl,
              CORS_ORIGINS: `http://127.0.0.1:${webPort}`,
            },
            url: `http://127.0.0.1:${apiPort}/health`,
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
          },
          {
            command:
              'pnpm exec vite build && pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort',
            env: { VITE_API_URL: `http://127.0.0.1:${apiPort}` },
            url: `http://127.0.0.1:${webPort}`,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
        ],
      }),
});
