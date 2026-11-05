import { expect, test } from '@playwright/test';
import { expectNoAccessibilityViolations } from './support/onboarding-flow.ts';
import { signUpToReveal, TRAINING_SESSIONS } from './support/program-flow.ts';
import { signUpToToday } from './support/screening-flow.ts';

// Needs the local stack: the seed script for invites and the fake auth server for sign-in.
test.skip(!!process.env.PLAYWRIGHT_BASE_URL, 'needs the local stack with the seed script');

const SESSION_DAYS_IN_WEEK = 7;

test('the reveal shows the first week, then Today, and the week view lists it by date', async ({
  page,
}, testInfo) => {
  await signUpToReveal(page, testInfo.title);

  // The Block, a wellness-worded line and the Sessions, each with every part of the Session.
  await expect(page.getByTestId('block-summary')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Strength Block' })).toBeVisible();
  await expect(page.getByText(/Sessions assume bodyweight and dumbbells/)).toBeVisible();
  const sessions = page.getByTestId('session-card');
  await expect(sessions).toHaveCount(TRAINING_SESSIONS);
  for (const part of ['Warm-up', 'Main strength', 'Cool-down']) {
    await expect(sessions.first().getByRole('heading', { name: part })).toBeVisible();
  }
  await expect(sessions.first().getByText(/45 min/)).toBeVisible();
  await expect(
    sessions
      .first()
      .getByText(/\d+ x \d+(-\d+)?, stop with \d in reserve/)
      .first(),
  ).toBeVisible();
  await expect(page.getByText(/more times?/).first()).toBeVisible();
  // The week was made by rules, not by AI: nothing claims otherwise.
  await expect(page.getByText(/Suggested by AI/i)).toHaveCount(0);
  await expectNoAccessibilityViolations(page);

  // Reloading shows the same week (creating the Program again is idempotent).
  const firstWeek = await page.getByTestId('week-list').innerText();
  await page.reload();
  await expect(page.getByTestId('session-card')).toHaveCount(TRAINING_SESSIONS);
  expect(await page.getByTestId('week-list').innerText()).toBe(firstWeek);

  await page.getByTestId('reveal-continue').click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

  // The week view is reachable from Today and lists every day of the week.
  await page.getByTestId('week-link').click();
  await expect(page).toHaveURL(/\/week$/);
  await expect(page.getByRole('heading', { name: 'Your week' })).toBeVisible();
  await expect(page.getByTestId('session-card')).toHaveCount(TRAINING_SESSIONS);
  await expect(page.getByTestId('free-day')).toHaveCount(SESSION_DAYS_IN_WEEK - TRAINING_SESSIONS);
  await expect(page.getByTestId('free-day').first()).toContainText('Free day');
  await expectNoAccessibilityViolations(page);
});

test('someone who chose food only skips the reveal and is told there is no training week', async ({
  page,
}, testInfo) => {
  await signUpToToday(page, testInfo.title);

  await page.goto('/reveal');

  await expect(page.getByTestId('reveal-unavailable')).toContainText('food only');
  await page.getByRole('button', { name: 'Continue to Today' }).click();
  await expect(page).toHaveURL(/\/today$/);

  await page.goto('/week');
  await expect(page.getByTestId('week-empty')).toBeVisible();
});
