import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { signUpToToday } from './support/screening-flow.ts';

test.describe('a phone set to Greek', () => {
  test.use({ locale: 'el-GR' });

  test('shows the invite screen in Greek, declares it for screen readers and stays accessible', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/start$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'el');
    await expect(
      page.getByRole('heading', { name: 'Το Stamina είναι προς το παρόν μόνο με πρόσκληση' }),
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('shows Today in Greek once signed in and cleared', async ({ page, browser }, testInfo) => {
    test.skip(!!process.env.PLAYWRIGHT_BASE_URL, 'needs the local stack with the seed script');
    // The sign-up screens are worded in English in the tests: do them in an English phone and
    // hand the session cookie to the Greek one.
    const english = await browser.newContext({ locale: 'en-US' });
    await signUpToToday(await english.newPage(), testInfo.title);
    await page.context().addCookies((await english.storageState()).cookies);
    await english.close();

    await page.goto('/today');

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
  await expect(page.getByRole('heading', { name: 'Stamina is invite-only for now' })).toBeVisible();
});
