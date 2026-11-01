import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// A real mailbox is needed against a live preview; locally a fake Neon Auth answers (code 424242).
test.skip(!!process.env.PLAYWRIGHT_BASE_URL, 'needs the local stack with the fake auth server');

const CODE = '424242';
const WRONG_CODE = '000000';

/** One email per test: the fake auth server keeps its state per address across parallel tests. */
function uniqueEmail(testTitle: string): string {
  return `${testTitle.replace(/\W+/g, '-').toLowerCase()}-${Date.now()}@example.com`;
}

async function requestCode(page: Page, email: string) {
  await page.goto('/sign-in');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByRole('button', { name: 'Send code' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
}

test('email, then the code, signs in: the API accepts the bearer token and /today opens', async ({
  page,
}, testInfo) => {
  const email = uniqueEmail(testInfo.title);
  await requestCode(page, email);

  const codeField = page.getByLabel(/6-digit code/);
  await expect(codeField).toBeFocused();
  await expect(codeField).toHaveAttribute('autocomplete', 'one-time-code');
  await expect(codeField).toHaveAttribute('inputmode', 'numeric');

  const me = page.waitForResponse((response) => new URL(response.url()).pathname === '/me');
  await codeField.fill(CODE);
  await page.getByRole('button', { name: 'Sign in' }).click();

  const response = await me;
  expect(response.status()).toBe(200);
  expect((await response.request().allHeaders()).authorization).toMatch(/^Bearer ey/);
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
});

test('a wrong code is explained and can be corrected', async ({ page }, testInfo) => {
  await requestCode(page, uniqueEmail(testInfo.title));

  await page.getByLabel(/6-digit code/).fill(WRONG_CODE);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('That code is not right. Check it and try again.')).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByLabel(/6-digit code/).fill(CODE);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/today$/);
});

test('three wrong codes ask for a new code', async ({ page }, testInfo) => {
  await requestCode(page, uniqueEmail(testInfo.title));

  for (let attempt = 0; attempt < 3; attempt++) {
    await page.getByLabel(/6-digit code/).fill(WRONG_CODE);
    await page.getByRole('button', { name: 'Sign in' }).click();
    // Each attempt must have been answered before the next one starts.
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  }

  await expect(page.getByText('Too many tries. Send a new code to continue.')).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test('a different email can be used from the code screen', async ({ page }, testInfo) => {
  await requestCode(page, uniqueEmail(testInfo.title));

  await page.getByRole('button', { name: 'Use a different email' }).click();

  await expect(page.getByRole('heading', { name: 'What is your email?' })).toBeVisible();
});

test('an email that is not an address is explained before any code is sent', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('not-an-email');
  await page.getByRole('button', { name: 'Send code' }).click();

  await expect(page.getByText('Enter a valid email address, like name@example.com.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What is your email?' })).toBeVisible();
});

test('both steps have no accessibility violations and 44 px targets', async ({
  page,
}, testInfo) => {
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'What is your email?' })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  for (const name of ['Send code', 'Continue with Google']) {
    expect((await page.getByRole('button', { name }).boundingBox())!.height).toBeGreaterThanOrEqual(
      44,
    );
  }

  await requestCode(page, uniqueEmail(testInfo.title));
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test.describe('a phone set to Greek', () => {
  test.use({ locale: 'el-GR' });

  test('shows both steps in Greek without accessibility violations', async ({ page }, testInfo) => {
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { name: 'Ποιο είναι το email σου;' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Συνέχεια με Google' })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page
      .getByRole('textbox', { name: 'Email', exact: true })
      .fill(uniqueEmail(testInfo.title));
    await page.getByRole('button', { name: 'Στείλε κωδικό' }).click();
    await expect(page.getByRole('heading', { name: 'Έλεγξε το email σου' })).toBeVisible();
    await expect(page.getByLabel(/6ψήφιος κωδικός/)).toBeFocused();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page.getByLabel(/6ψήφιος κωδικός/).fill('000000');
    await page.getByRole('button', { name: 'Σύνδεση' }).click();
    await expect(
      page.getByText('Ο κωδικός δεν είναι σωστός. Έλεγξέ τον και δοκίμασε ξανά.'),
    ).toBeVisible();
  });
});
