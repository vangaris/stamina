import { expect, test } from '@playwright/test';
import { expectNoAccessibilityViolations } from './support/onboarding-flow.ts';
import { signUpToReveal } from './support/program-flow.ts';

// Needs the local stack: the seed script for invites, the fake auth server and the database.
test.skip(!!process.env.PLAYWRIGHT_BASE_URL, 'needs the local stack with the seed script');

const JOURNEY_TIMEOUT_MS = 120_000;
/** Chest pain asks two Screening questions again: the heart question and the chest question. */
const RECHECK_QUESTIONS = 2;
/** A head knock asks one: the head injury question. */
const HEAD_KNOCK_QUESTIONS = 1;

test('the Stop button stops training until a doctor has seen the person, and the questions a flag asks are not skipped', async ({
  page,
}, testInfo) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);
  await signUpToReveal(page, testInfo.title);
  await page.getByTestId('reveal-continue').click();
  await page.getByTestId('week-link').click();
  await page.getByTestId('session-start').first().click();
  await expect(page.getByTestId('focus-view')).toBeVisible();

  // The Stop button is on the Session screen and opens the list of seven.
  await page.getByTestId('stop-open').click();
  await expect(page.getByTestId('stop-options').getByRole('button')).toHaveCount(7);

  // Chest pain: the message is shown at once, with the emergency number.
  await page.getByTestId('stop-option-chest-pain').click();
  await expect(page.getByTestId('stop-emergency')).toHaveText(
    "Stop training. If symptoms are severe or don't settle, call 112 now.",
  );
  await expect(page.getByTestId('stop-outcome')).toContainText(
    'Training is paused until you confirm a doctor has seen you.',
  );
  await expectNoAccessibilityViolations(page);

  // The Screening questions the flag asks again; answering no to both keeps the person screened in.
  await page.getByTestId('stop-continue').click();
  const questions = page.getByTestId('stop-recheck').getByRole('radiogroup');
  await expect(questions).toHaveCount(RECHECK_QUESTIONS);
  for (const question of await questions.all()) {
    await question.getByRole('radio', { name: 'No', exact: true }).click();
  }
  await page.getByTestId('stop-recheck-submit').click();

  // Paused: the guard keeps the person here, whichever screen they try.
  await expect(page).toHaveURL(/\/paused$/);
  await expect(page.getByRole('heading', { name: 'Training is paused' })).toBeVisible();
  await expect(page.getByTestId('stop-emergency')).toContainText('call 112 now');
  await expectNoAccessibilityViolations(page);
  await page.goto('/today');
  await expect(page).toHaveURL(/\/paused$/);

  // The only way back is the confirmation. The questions were answered, so none are asked again.
  await expect(page.getByTestId('paused-confirm')).toHaveText('A doctor has seen me');
  await page.getByTestId('paused-confirm').click();
  await expect(page).toHaveURL(/\/today$/);

  // A head knock reported from a Session; the sheet is closed before its question is answered.
  await page.getByTestId('week-link').click();
  await page.getByTestId('session-start').first().click();
  await expect(page.getByTestId('focus-view')).toBeVisible();
  await page.getByTestId('stop-open').click();
  await page.getByTestId('stop-option-head-knock').click();
  await expect(page.getByTestId('stop-outcome')).toContainText(
    'Training is paused until a doctor has cleared you.',
  );
  await page.getByRole('button', { name: 'Close', exact: true }).click();

  // Paused: a head knock is cleared by a doctor, and the owed question is asked after the confirmation.
  await expect(page).toHaveURL(/\/paused$/);
  await expect(page.getByTestId('paused-confirm')).toHaveText('A doctor has cleared me');
  await page.getByTestId('paused-confirm').click();
  await expect(page).toHaveURL(/\/paused$/);
  const owed = page.getByTestId('stop-recheck').getByRole('radiogroup');
  await expect(owed).toHaveCount(HEAD_KNOCK_QUESTIONS);
  await owed.first().getByRole('radio', { name: 'No', exact: true }).click();
  await page.getByTestId('paused-recheck-submit').click();
  await expect(page).toHaveURL(/\/today$/);
});
