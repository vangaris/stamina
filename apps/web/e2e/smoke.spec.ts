import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { signUpToToday } from './support/screening-flow.ts';

test('signed out, the shell opens the invite screen without tabs and with no accessibility violations', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/start$/);
  await expect(page.getByRole('heading', { name: 'Stamina is invite-only for now' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

// A code nobody holds: the API answers "not valid" only if the browser reached it (CORS, URL, Worker up).
test('the invite screen reaches the API', async ({ page }) => {
  await page.goto('/start');
  await page.getByLabel('Invite code').fill('ZZZZZZZZZZ');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(
    page.getByText('That invite code is not valid, or it has already been used.'),
  ).toBeVisible();
});

// Today is behind sign-in, consent and Screening: these need the local stack's seed script and fake auth.
test.describe('signed in and cleared', () => {
  test.skip(!!process.env.PLAYWRIGHT_BASE_URL, 'needs the local stack with the seed script');

  test('the shell reaches the API, has 44 px tabs and no accessibility violations', async ({
    page,
  }, testInfo) => {
    await signUpToToday(page, testInfo.title);

    await expect(page.getByTestId('api-status')).toHaveAttribute('data-state', 'ok');

    const nav = page.getByRole('navigation', { name: 'Main' });
    for (const tab of ['Today', 'Session', 'Meals', 'Progress']) {
      const link = nav.getByRole('link', { name: tab });
      await expect(link).toBeVisible();
      // 44 px minimum tap target; fails if the UI package's classes are not compiled into the CSS.
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('tabs navigate between the four screens', async ({ page }, testInfo) => {
    await signUpToToday(page, testInfo.title);
    const nav = page.getByRole('navigation', { name: 'Main' });

    for (const tab of ['Session', 'Meals', 'Progress', 'Today']) {
      await nav.getByRole('link', { name: tab }).click();
      await expect(page.getByRole('heading', { name: tab, level: 1, exact: true })).toBeVisible();
      await expect(nav.getByRole('link', { name: tab })).toHaveAttribute('aria-current', 'page');
    }
  });
});

test('is installable: manifest is served and a service worker takes control', async ({ page }) => {
  await page.goto('/');

  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await page.request.get(new URL(href!, page.url()).toString())).json();
  expect(manifest).toMatchObject({ display: 'standalone', name: 'Stamina' });
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );

  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
});
