import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('a phone set to Greek', () => {
  test.use({ locale: 'el-GR' });

  test('shows the app in Greek, declares it for screen readers and stays accessible', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'el');
    const nav = page.getByRole('navigation', { name: 'Κύρια πλοήγηση' });
    for (const tab of ['Σήμερα', 'Προπόνηση', 'Γεύματα', 'Πρόοδος']) {
      await expect(nav.getByRole('link', { name: tab })).toBeVisible();
    }
    await expect(page.getByRole('heading', { name: 'Σήμερα' })).toBeVisible();
    // The ICU argument {state} is filled in by the Greek message, with a Greek state name.
    await expect(page.getByTestId('api-status')).toHaveText(
      /^Διακομιστής: (Συνδέθηκε|Έλεγχος…|Η βάση δεδομένων δεν είναι διαθέσιμη|Εκτός σύνδεσης)$/,
    );

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test('a phone in another language gets English, the source language', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
});
