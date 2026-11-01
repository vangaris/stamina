import { expect, test } from '@playwright/test';

// Runs against the production build (and a deployed preview): the UI kit page is dev-only.
test('the dev UI kit page is not part of a production build', async ({ page }) => {
  await page.goto('/dev/ui');
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'UI kit' })).toHaveCount(0);
  await expect(page.getByTestId('ui-kit')).toHaveCount(0);
});
