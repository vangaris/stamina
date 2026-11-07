import { expect, test } from '@playwright/test';
import { expectNoAccessibilityViolations } from './support/onboarding-flow.ts';
import { signUpToReveal } from './support/program-flow.ts';

// Needs the local stack: the seed script for invites, the fake auth server and the database.
test.skip(!!process.env.PLAYWRIGHT_BASE_URL, 'needs the local stack with the seed script');

const JOURNEY_TIMEOUT_MS = 120_000;
const UNUSUAL_OPTIONS = [
  'Chest pain or pressure',
  'Fainting or dizziness',
  'Unusual breathlessness',
  'Racing or irregular heartbeat',
  'Fever or feeling ill',
  'New pain or swelling',
  'Head knock',
];

test('three taps answer the Check-in on Today, then "Something unusual" lists the seven options', async ({
  page,
}, testInfo) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);
  await signUpToReveal(page, testInfo.title);
  await page.getByTestId('reveal-continue').click();
  await expect(page).toHaveURL(/\/today$/);

  // One question per screen: sleep, soreness, energy. The third answer sends it.
  const heading = page.getByTestId('checkin-heading');
  await expect(heading).toHaveText('How did you sleep?');
  await expectNoAccessibilityViolations(page);
  await page.getByTestId('checkin-score-4').click();
  await expect(heading).toHaveText('How do your muscles feel?');
  await page.getByTestId('checkin-score-2').click();
  await expect(heading).toHaveText('How is your energy?');
  await page.getByTestId('checkin-score-3').click();

  // Done: the answers sent, and the row for anything unusual.
  const done = page.getByTestId('checkin-done');
  await expect(done).toBeVisible();
  await expect(page.getByTestId('checkin-notice')).toBeVisible();
  const answers = page.getByTestId('checkin-answers');
  await expect(answers).toContainText('Sleep');
  await expect(answers).toContainText('4 of 5');
  await expect(answers).toContainText('2 of 5');
  await expect(answers).toContainText('3 of 5');
  await expect(page.getByTestId('checkin-question')).toBeHidden();
  await expectNoAccessibilityViolations(page);

  // Reloading keeps the done card: today's Check-in is already in.
  await page.reload();
  await expect(page.getByTestId('checkin-done')).toBeVisible();
  await expect(page.getByTestId('checkin-question')).toBeHidden();

  // "Something unusual" opens the list of seven.
  await page.getByTestId('unusual-something').click();
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  for (const option of UNUSUAL_OPTIONS) {
    await expect(sheet.getByText(option, { exact: true })).toBeVisible();
  }
});
