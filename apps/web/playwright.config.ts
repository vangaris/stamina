import { defineConfig, devices } from '@playwright/test';

/**
 * Seam 3: phone-sized browser journeys. Against a deployed preview set `PLAYWRIGHT_BASE_URL`;
 * otherwise a local stack (dev Postgres + API + built web) is started.
 */
const remote = process.env.PLAYWRIGHT_BASE_URL;
const dbPort = 54330;
const apiPort = 8788;
// Fake Neon Auth (e2e/support/fake-better-auth.ts). Served under /auth like Neon's base_url, so
// the API gets it as NEON_AUTH_BASE_URL and the web previews proxy /auth to it.
const authPort = 8789;
const authBaseUrl = `http://127.0.0.1:${authPort}/auth`;
const webPort = 4173;
// A second build with a (fake) Sentry DSN, for e2e/sentry.spec.ts; every other test runs against the build without one.
const sentryWebPort = 4174;
// The dev-only UI kit page exists only on the Vite dev server, never in a production build.
const devWebPort = 5174;
const sentryDsn = 'https://e2ekey@o0.ingest.de.sentry.io/1';
const sentryBuildDir = 'node_modules/.cache/e2e-sentry';
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
  projects: [
    {
      name: 'phone',
      testIgnore: /(sentry|ui-kit(-[\w-]+)?)\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
    ...(remote
      ? []
      : [
          {
            name: 'ui-kit',
            testMatch: /ui-kit(-[\w-]+)?\.spec\.ts/,
            use: { ...devices['Pixel 7'], baseURL: `http://127.0.0.1:${devWebPort}` },
          },
          {
            name: 'sentry',
            testMatch: /sentry\.spec\.ts/,
            // A service worker could answer the ingest request before page.route sees it.
            use: {
              ...devices['Pixel 7'],
              baseURL: `http://127.0.0.1:${sentryWebPort}`,
              serviceWorkers: 'block' as const,
            },
          },
        ]),
  ],
  ...(remote
    ? {}
    : {
        webServer: [
          {
            command: `pnpm exec vite --host 127.0.0.1 --port ${devWebPort} --strictPort`,
            url: `http://127.0.0.1:${devWebPort}`,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
          {
            command: 'pnpm exec tsx e2e/support/fake-better-auth.ts',
            env: {
              PORT: String(authPort),
              TRUSTED_ORIGINS: `http://127.0.0.1:${webPort},http://127.0.0.1:${sentryWebPort}`,
            },
            url: `${authBaseUrl}/.well-known/jwks.json`,
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
          },
          {
            command: 'pnpm --filter @stamina/api db:dev',
            env: { DEV_DB_PORT: String(dbPort), DEV_DB_DIR: '.pgdata-e2e' },
            port: dbPort,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
          {
            command: 'pnpm --filter @stamina/api exec tsx src/main.node.ts',
            env: {
              PORT: String(apiPort),
              DATABASE_URL: databaseUrl,
              NEON_AUTH_BASE_URL: authBaseUrl,
              CORS_ORIGINS: `http://127.0.0.1:${webPort},http://127.0.0.1:${sentryWebPort}`,
            },
            url: `http://127.0.0.1:${apiPort}/health`,
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
          },
          {
            command: `pnpm exec vite build && pnpm exec vite preview --host 127.0.0.1 --port ${webPort} --strictPort`,
            env: { VITE_API_URL: `http://127.0.0.1:${apiPort}`, AUTH_PROXY_TARGET: authBaseUrl },
            url: `http://127.0.0.1:${webPort}`,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
          {
            command: `pnpm exec vite build --outDir ${sentryBuildDir} --emptyOutDir && pnpm exec vite preview --outDir ${sentryBuildDir} --host 127.0.0.1 --port ${sentryWebPort} --strictPort`,
            env: {
              VITE_API_URL: `http://127.0.0.1:${apiPort}`,
              AUTH_PROXY_TARGET: authBaseUrl,
              VITE_SENTRY_DSN: sentryDsn,
              VITE_SENTRY_ENVIRONMENT: 'e2e',
            },
            url: `http://127.0.0.1:${sentryWebPort}`,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
        ],
      }),
});
