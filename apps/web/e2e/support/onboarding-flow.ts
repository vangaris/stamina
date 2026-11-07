import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { E2E_API_URL } from './e2e-stack.ts';

export const OTP = '424242';
export const ADULT_BIRTH_YEAR = '1990';
export const UNKNOWN_CODE = 'ABCDEFGHJK';

/** One email per test: the fake auth server keeps its state per address across parallel tests. */
export function uniqueEmail(testTitle: string): string {
  return `${testTitle.replace(/\W+/g, '-').toLowerCase()}-${Date.now()}@example.com`;
}

export async function inviteIsUsable(page: Page, code: string): Promise<boolean> {
  const response = await page.request.post(`${E2E_API_URL}/invites/check`, { data: { code } });
  return ((await response.json()) as { valid: boolean }).valid;
}

/** Invite code, then sign in with the emailed code: lands on the first onboarding screen. */
export async function startAndSignIn(page: Page, code: string, email: string) {
  await page.goto('/start');
  await page.getByLabel('Invite code').fill(code);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByRole('button', { name: 'Send code' }).click();
  await page.getByLabel(/6-digit code/).fill(OTP);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Tell us about you' })).toBeVisible();
}

export async function answerAbout(
  page: Page,
  { needs, birthYear, country }: { needs: string; birthYear: string; country: string },
) {
  await page.getByRole('radio', { name: needs, exact: true }).click();
  await page.getByLabel('Birth year').fill(birthYear);
  await page.getByLabel('Country of residence').selectOption(country);
  await page.getByRole('button', { name: 'Continue' }).click();
}

/** Kitesurfing, hard: on Saturdays, or on days that vary (then no Activity is a planned one). */
export async function answerSport(
  page: Page,
  { playVaries = false }: { playVaries?: boolean } = {},
) {
  await expect(page.getByRole('heading', { name: 'Your sport' })).toBeVisible();
  await page.getByRole('radio', { name: 'Kitesurfing', exact: true }).click();
  await page.getByRole('checkbox', { name: playVaries ? 'It varies' : 'Sat', exact: true }).click();
  await page.getByRole('radio', { name: 'Hard', exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
}

export async function answerGoal(page: Page, goal: string, button: 'Continue' | 'Finish') {
  await expect(page.getByRole('heading', { name: 'Your Goal' })).toBeVisible();
  await page.getByRole('radio', { name: goal, exact: true }).click();
  await page.getByRole('button', { name: button }).click();
}

/** Axe reads colours as drawn, so a colour still fading (transition-colors) can fail contrast for a frame. */
export async function expectNoAccessibilityViolations(page: Page) {
  await page.evaluate(() =>
    Promise.allSettled(document.getAnimations().map((animation) => animation.finished)),
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
}

export const isProfilePost = (request: { url(): string; method(): string }) =>
  new URL(request.url()).pathname === '/profile' && request.method() === 'POST';
