import { expect, test, type Page } from '@playwright/test';
import { expectNoAccessibilityViolations } from './support/onboarding-flow.ts';
import {
  acceptConsents,
  answerScreening,
  continueFromOutcome,
  QUESTION,
  signUpToConsent,
  signUpToToday,
} from './support/screening-flow.ts';

// Needs the local stack: the seed script for invites, the fake auth server and the database.
test.skip(!!process.env.PLAYWRIGHT_BASE_URL, 'needs the local stack with the seed script');

const JOURNEY_TIMEOUT_MS = 120_000;
/** The default meals per day is three: breakfast, lunch and dinner. */
const DEFAULT_MEAL_SLOTS = 3;

async function openMeals(page: Page) {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Meals' }).click();
  await expect(page).toHaveURL(/\/meals$/);
  await expect(page.getByRole('heading', { name: 'Meals', level: 1 })).toBeVisible();
}

test('unlock Meals, see the targets, log water, and Today shows the meal slots and the water bar', async ({
  page,
}, testInfo) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);
  await signUpToToday(page, testInfo.title);

  // Locked: Today offers to unlock Meals and shows no meal slots or water.
  await expect(page.getByTestId('unlock-meals-card')).toBeVisible();
  await expect(page.getByTestId('water-bar')).toHaveCount(0);
  await page.getByTestId('unlock-meals-link').click();
  await expect(page).toHaveURL(/\/meals$/);
  const form = page.getByTestId('unlock-meals');
  await expect(form).toBeVisible();
  await expect(form.getByRole('checkbox')).toHaveCount(14);
  await expect(page.getByTestId('unlock-direction')).toHaveCount(0);
  await expectNoAccessibilityViolations(page);

  // Missing answers are named and nothing is saved.
  await page.getByTestId('unlock-save').click();
  await expect(page.getByText('Enter a height between 120 and 230 cm.')).toBeVisible();
  await expect(page.getByTestId('targets')).toHaveCount(0);

  await page.getByRole('radio', { name: 'Female', exact: true }).click();
  await page.getByLabel('Height').fill('168');
  await page.getByLabel('Weight').fill('62');
  await page.getByRole('radio', { name: 'On my feet', exact: true }).click();
  await form.getByRole('checkbox', { name: 'Peanuts', exact: true }).click();
  await page.getByTestId('unlock-dislike').fill('olives');
  await page.getByTestId('unlock-dislike-add').click();
  await expect(page.getByTestId('unlock-dislikes')).toContainText('olives');
  await page.getByTestId('unlock-save').click();

  // Ready: the day's targets and the water target.
  await expect(page.getByTestId('targets')).toBeVisible();
  await expect(page.getByTestId('day-type')).not.toBeEmpty();
  await expect(page.getByTestId('targets-energy')).toContainText('kcal');
  await expect(page.getByTestId('targets-protein')).toContainText('Protein');
  await expect(page.getByTestId('targets-carbs')).toContainText('Carbohydrate');
  await expect(page.getByTestId('targets-fat')).toContainText('Fat');
  await expect(page.getByTestId('reds-card')).toBeVisible();
  await expect(page.getByTestId('meals-guidance')).toContainText('ask a dietitian');
  await expect(page.getByTestId('meals-water-progress')).toContainText('0 of');
  await expectNoAccessibilityViolations(page);

  // One tap adds 250 ml.
  await page.getByRole('button', { name: 'Add 250 ml of water' }).click();
  await expect(page.getByTestId('meals-water-progress')).toContainText('250 of');

  // Today: the meal slots and the water bar with what was drunk.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Today' }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByTestId('unlock-meals-card')).toHaveCount(0);
  await expect(page.locator('[data-kind="meal-slot"]')).toHaveCount(DEFAULT_MEAL_SLOTS);
  await expect(page.getByTestId('water-bar')).toBeVisible();
  await expect(page.getByTestId('timeline')).toContainText('250 of');

  // The same buttons are on Today.
  await page.getByTestId('today-water-add-500').click();
  await expect(page.getByTestId('timeline')).toContainText('750 of');
});

test('Settings -> Safety shows the warning-signs card', async ({ page }, testInfo) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);
  await signUpToToday(page, testInfo.title);

  await page.getByTestId('settings-link').click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.getByTestId('settings-safety-link').click();
  await expect(page).toHaveURL(/\/settings\/safety$/);

  const card = page.getByTestId('reds-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('talk to a doctor or dietitian');
  await expectNoAccessibilityViolations(page);
});

test('a person with Nutrition switched off sees the notice, no targets and no water', async ({
  page,
}, testInfo) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);
  await signUpToConsent(page, testInfo.title);
  await acceptConsents(page);
  await answerScreening(page, { yes: [QUESTION.eatingDisorder] });
  await page.getByRole('button', { name: 'Continue' }).click();
  await continueFromOutcome(page);
  await expect(page).toHaveURL(/\/today$/);

  await expect(page.getByTestId('unlock-meals-card')).toHaveCount(0);
  await expect(page.getByTestId('water-bar')).toHaveCount(0);
  await openMeals(page);
  await expect(page.getByTestId('meals-off')).toContainText('Nutrition is switched off for you');
  await expect(page.getByTestId('targets')).toHaveCount(0);
  await expect(page.getByTestId('unlock-meals')).toHaveCount(0);
});
