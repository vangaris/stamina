import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('shell loads at phone width, reaches the API and has no accessibility violations', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
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

test('tabs navigate between the four screens', async ({ page }) => {
  await page.goto('/today');
  const nav = page.getByRole('navigation', { name: 'Main' });

  for (const tab of ['Session', 'Meals', 'Progress', 'Today']) {
    await nav.getByRole('link', { name: tab }).click();
    await expect(page.getByRole('heading', { name: tab })).toBeVisible();
    await expect(nav.getByRole('link', { name: tab })).toHaveAttribute('aria-current', 'page');
  }
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
