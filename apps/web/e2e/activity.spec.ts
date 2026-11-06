import { expect, test } from '@playwright/test';
import { expectNoAccessibilityViolations } from './support/onboarding-flow.ts';
import { signUpToReveal } from './support/program-flow.ts';

// Needs the local stack: the seed script for invites, the fake auth server and the database.
test.skip(!!process.env.PLAYWRIGHT_BASE_URL, 'needs the local stack with the seed script');

const JOURNEY_TIMEOUT_MS = 120_000;
/** The onboarding journey picks a hard kitesurfing play day: Hard counts as RPE 8, Easy as RPE 4. */
const HARD_RPE = 8;
const EASY_RPE = 4;
const LOAD_LINE = /Load = (\d+) min × effort (\d+) = (\d+)/;

test('"I played" shows its Load before saving, then the Activity and the week Load are on the week', async ({
  page,
}, testInfo) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);
  await signUpToReveal(page, testInfo.title);
  await page.getByTestId('reveal-continue').click();
  await expect(page).toHaveURL(/\/today$/);

  // One tap opens the sheet, filled in from what the person said about their sport.
  await page.getByTestId('played-open').click();
  const sheet = page.getByTestId('played-sheet');
  await expect(sheet).toBeVisible();
  await expect(page.getByLabel('Sport')).toHaveValue('kitesurfing');
  await expect(page.getByRole('radio', { name: 'Hard', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'It was hot' })).toBeChecked();
  await expectNoAccessibilityViolations(page);

  // The Load shows before anything is saved, and follows the effort.
  const load = page.getByTestId('played-load');
  await expect(load).toHaveText(LOAD_LINE);
  const [, minutes, hardRpe, hardLoad] = (await load.innerText()).match(LOAD_LINE)!;
  expect(Number(hardRpe)).toBe(HARD_RPE);
  expect(Number(hardLoad)).toBe(Number(minutes) * HARD_RPE);
  await page.getByRole('radio', { name: 'Easy', exact: true }).click();
  await expect(load).toContainText(`effort ${EASY_RPE}`);
  await expect(load).toContainText(`= ${Number(minutes) * EASY_RPE}`);

  // Save in one tap: the sheet closes and Today says so, with the Load.
  await page.getByTestId('played-save').click();
  await expect(sheet).toBeHidden();
  await expect(page.getByTestId('played-notice')).toContainText(
    `Load ${Number(minutes) * EASY_RPE}`,
  );

  // The week shows the Activity as done with its Load, and the week Load with no usual yet.
  await page.getByTestId('week-link').click();
  await expect(page).toHaveURL(/\/week$/);
  const done = page.getByTestId('activity-done');
  await expect(done).toHaveCount(1);
  await expect(done.getByTestId('activity-load')).toHaveText(`Load ${Number(minutes) * EASY_RPE}`);
  await expect(page.getByTestId('load-this-week')).toContainText('This week');
  await expect(page.getByTestId('load-no-usual')).toBeVisible();
  await expectNoAccessibilityViolations(page);
});
