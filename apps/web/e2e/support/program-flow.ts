import { expect, type Page } from '@playwright/test';
import { createInvites } from './create-invites.ts';
import {
  ADULT_BIRTH_YEAR,
  answerAbout,
  answerGoal,
  answerSport,
  startAndSignIn,
  uniqueEmail,
} from './onboarding-flow.ts';
import { acceptConsents, answerScreening, continueFromOutcome } from './screening-flow.ts';

/** The training week the journey picks: two 45-minute Sessions, on Monday and Thursday. */
export const TRAINING_SESSIONS = 2;

/** `answerSport` picks one hard play day (Saturday): it shows as a play day, not a free one. */
export const HARD_PLAY_DAYS = 1;

/** A new person who wants a training program, signed in and cleared: ends on the Program reveal. */
export async function signUpToReveal(page: Page, testTitle: string) {
  const [code] = await createInvites();
  await startAndSignIn(page, code!, uniqueEmail(testTitle));
  await answerAbout(page, {
    needs: 'A training program',
    birthYear: ADULT_BIRTH_YEAR,
    country: 'GR',
  });
  await answerSport(page);
  await answerGoal(page, 'Get stronger', 'Continue');

  await expect(page.getByText('Step 4 of 4')).toBeVisible();
  await page.getByRole('radio', { name: '45 min', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Mon', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Sessions per week' }).press('ArrowDown');
  await page.getByRole('checkbox', { name: 'Thu', exact: true }).click();
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page).toHaveURL(/\/consent$/);

  await acceptConsents(page);
  await answerScreening(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await continueFromOutcome(page);
  await expect(page).toHaveURL(/\/reveal$/);
  await expect(page.getByRole('heading', { name: 'Your first week is ready' })).toBeVisible();
}
