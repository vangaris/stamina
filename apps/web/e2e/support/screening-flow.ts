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

/** Part of each question's wording, enough to find its yes/no group (English). */
export const QUESTION = {
  heartCondition: /heart condition/,
  pregnancy: /Are you pregnant/,
  eatingDisorder: /eating disorder/,
  boneJointMuscle: /bone, joint or muscle problem/,
} as const;

/** A new person with a saved profile, signed in, on the consent screen (a food-only profile is the shortest). */
export async function signUpToConsent(page: Page, testTitle: string) {
  const [code] = await createInvites();
  await startAndSignIn(page, code!, uniqueEmail(testTitle));
  await answerAbout(page, {
    needs: 'What to eat and drink',
    birthYear: ADULT_BIRTH_YEAR,
    country: 'GR',
  });
  await answerSport(page);
  await answerGoal(page, 'General fitness', 'Finish');
  await expect(page).toHaveURL(/\/consent$/);
  await expect(page.getByRole('heading', { name: 'Before you start' })).toBeVisible();
}

/** Ticks both consent boxes and continues to the Screening page. */
export async function acceptConsents(page: Page) {
  await page.getByRole('checkbox', { name: /I have read and accept/ }).check();
  await page.getByRole('checkbox', { name: /I agree that Stamina may process/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/screening$/);
  await expect(page.getByRole('heading', { name: 'A few health questions' })).toBeVisible();
}

/** Answers every question no and the starting level no, then flips the given questions to yes. */
export async function answerScreening(page: Page, { yes = [] }: { yes?: RegExp[] } = {}) {
  for (const group of await page.getByRole('radiogroup').all()) {
    await group.getByRole('radio', { name: 'No', exact: true }).click();
  }
  for (const question of yes) {
    await page
      .getByRole('radiogroup', { name: question })
      .getByRole('radio', { name: 'Yes', exact: true })
      .click();
  }
}

/** A new person, signed in and cleared: profile, both consents, an all-no Screening, then Today. */
export async function signUpToToday(page: Page, testTitle: string) {
  await signUpToConsent(page, testTitle);
  await acceptConsents(page);
  await answerScreening(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue to Today' }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
}
