import { expect, test } from '@playwright/test';

// Needs the web build with a fake DSN that only the local stack provides (see playwright.config.ts).
test.skip(!!process.env.PLAYWRIGHT_BASE_URL, 'runs only against the local stack');

const SENTINELS = {
  error: 'SENTINEL-ERROR-eating-disorder-history',
  query: 'SENTINEL-QUERY-resting-hr-48',
  console: 'SENTINEL-CONSOLE-knee-injury',
  storage: 'SENTINEL-STORAGE-diabetes-type-2',
};

test('a browser error reaches Sentry without the user data around it', async ({ page }) => {
  const envelopes: string[] = [];
  await page.route('**/api/1/envelope/**', async (route) => {
    envelopes.push(route.request().postData() ?? '');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: '{}',
    });
  });

  await page.goto(`/today?note=${SENTINELS.query}`);
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await page.evaluate((s) => {
    localStorage.setItem('profile', s.storage);
    console.log(s.console);
    // Unhandled, so it goes through window.onerror like a real bug would.
    setTimeout(() => {
      throw new TypeError(s.error);
    });
  }, SENTINELS);

  await expect.poll(() => envelopes.length, { timeout: 10_000 }).toBeGreaterThan(0);

  const body = envelopes.join('\n');
  const event = JSON.parse(body.split('\n').find((line) => line.includes('"exception"'))!);
  expect(event.exception.values[0]).toMatchObject({ type: 'TypeError', value: '' });
  expect(event.exception.values[0].stacktrace.frames.length).toBeGreaterThan(0);
  expect(event.environment).toBe('e2e');
  for (const dropped of ['request', 'user', 'extra', 'breadcrumbs', 'message', 'contexts']) {
    expect(event).not.toHaveProperty(dropped);
  }
  for (const sentinel of Object.values(SENTINELS)) expect(body).not.toContain(sentinel);
});
