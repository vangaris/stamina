import { expect, test } from '@playwright/test';
import { expectNoAccessibilityViolations } from './support/onboarding-flow.ts';
import { signUpToReveal } from './support/program-flow.ts';

// Needs the local stack: the seed script for invites, the fake auth server and the database.
test.skip(!!process.env.PLAYWRIGHT_BASE_URL, 'needs the local stack with the seed script');

const JOURNEY_TIMEOUT_MS = 120_000;

test('"I played" hard the day before a heavy Session suggests a change; accepting it revises the week', async ({
  page,
}, testInfo) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);
  // Plays on varying days and trains any day: the first Session is tomorrow, so a hard game today
  // always falls inside its recovery window, whatever day the test runs on.
  await signUpToReveal(page, testInfo.title, { flexibleWeek: true });
  await page.getByTestId('reveal-continue').click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByTestId('adaptation-card')).toHaveCount(0);

  // One tap: hard effort, from what the person said about their sport.
  await page.getByTestId('played-open').click();
  await page.getByTestId('played-save').click();
  await expect(page.getByTestId('played-notice')).toBeVisible();

  // The suggestion sits at the top of Today with its change and a reason made of the numbers.
  const card = page.getByTestId('adaptation-card');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText(/You played for \d+ min at a hard effort \(Load \d+\)/);
  await expect(page.getByTestId('adaptation-accept')).toBeVisible();
  await expect(page.getByTestId('adaptation-decline')).toBeVisible();
  await expectNoAccessibilityViolations(page);

  // Nothing changed yet: the week is the one the person was shown.
  await page.getByTestId('week-link').click();
  await expect(page).toHaveURL(/\/week$/);
  await expect(page.getByTestId('week-list')).toBeVisible();
  const weekBefore = await page.getByTestId('week-list').innerText();
  await page.goBack();

  // Accepting changes the plan: the card goes and the week shows the revised Session.
  await page.getByTestId('adaptation-accept').click();
  await expect(card).toHaveCount(0);
  await page.getByTestId('week-link').click();
  await expect(page.getByTestId('week-list')).toBeVisible();
  await expect(page.getByTestId('week-list')).not.toHaveText(weekBefore);
  await expect(page.getByTestId('session-card')).toHaveCount(2);
  await expectNoAccessibilityViolations(page);
});
