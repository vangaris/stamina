import { expect, test } from '@playwright/test';
import pg from 'pg';
import { E2E_DATABASE_URL } from './support/e2e-stack.ts';
import { expectNoAccessibilityViolations } from './support/onboarding-flow.ts';
import { signUpToReveal } from './support/program-flow.ts';

// Needs the local stack: the seed script for invites, the fake auth server and the database.
test.skip(!!process.env.PLAYWRIGHT_BASE_URL, 'needs the local stack with the seed script');

const JOURNEY_TIMEOUT_MS = 120_000;
const WIND_DOWN_TIME = '22:30';
const WEIGHT_TYPED = '72,5';
const WEIGHT_SHOWN = '72.5 kg';
const TOO_LIGHT = '20';

/** The calendar day on the phone's own clock, as `YYYY-MM-DD` (the browser and this test share a clock). */
const localToday = () => new Date().toLocaleDateString('en-CA');

/** A new person's first Session is tomorrow; this moves it to today, so Today has a Session to show. */
async function moveSessionToToday(sessionId: string) {
  const client = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    await client.query('update session set date = $1 where id = $2', [localToday(), sessionId]);
  } finally {
    await client.end();
  }
}

test('Today lists the Session with Start and the wind-down in order, and "I played" stays in reach', async ({
  page,
}, testInfo) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);
  await signUpToReveal(page, testInfo.title);
  await page.getByTestId('reveal-continue').click();
  await page.getByTestId('week-link').click();
  await expect(page).toHaveURL(/\/week$/);
  await page.getByTestId('session-start').first().click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
  await moveSessionToToday(page.url().split('/').pop()!);

  await page.goto('/today');
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
  await expect(page.getByTestId('today-date')).toBeVisible();
  await expect(page.getByTestId('today-load-this-week')).toContainText(/Load \d+/);

  // The Session first, with its Start button; the wind-down closes the day.
  const entries = page.getByTestId('timeline-entry');
  await expect(entries.first()).toHaveAttribute('data-kind', 'session');
  await expect(entries.first().getByTestId('session-start')).toHaveText('Start Session');
  await expect(entries.last()).toHaveAttribute('data-kind', 'wind-down');
  await expect(entries.last()).toContainText(WIND_DOWN_TIME);
  await expectNoAccessibilityViolations(page);

  // "I played" is in view at the top of the page and still in view after scrolling to its end.
  const played = page.getByTestId('played-open');
  await expect(played).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(played).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(played).toBeInViewport();

  // Start opens the Session.
  await entries.first().getByTestId('session-start').click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
});

test('Progress shows Sessions, Activities, the Load bars and a verdict, and saves the optional weigh-in', async ({
  page,
}, testInfo) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);
  await signUpToReveal(page, testInfo.title);
  await page.getByTestId('reveal-continue').click();
  await page.getByTestId('week-link').click();
  await page.getByTestId('session-start').first().click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
  // The first Session is tomorrow, which can fall in the next week; today's week must hold one.
  await moveSessionToToday(page.url().split('/').pop()!);

  await page.goto('/progress');
  await expect(page).toHaveURL(/\/progress$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Progress' })).toBeVisible();
  await expect(page.getByTestId('progress-verdict')).toBeVisible();
  await expect(page.getByTestId('progress-sessions')).toContainText(/\d+ of \d+ Sessions? done/);
  await expect(page.getByTestId('progress-activities')).toContainText(/logged/);
  await expect(page.getByTestId('progress-load')).toBeVisible();
  // The chart is a picture for the eyes; its numbers are in a table for everyone else.
  const table = page.getByRole('table', { name: 'Load for each of the last weeks and this week' });
  await expect(table.getByRole('row').nth(1)).toBeAttached();
  await expect(page.getByTestId('weigh-in-due')).toBeVisible();
  await expect(page.getByTestId('weigh-in-none')).toBeVisible();
  await expectNoAccessibilityViolations(page);

  // A weight outside 30 to 300 kg is refused with a message beside the field.
  const weight = page.getByRole('textbox', { name: 'Weight' });
  await weight.fill(TOO_LIGHT);
  await page.getByTestId('weigh-in-save').click();
  await expect(page.getByText('Enter a weight between 30 and 300 kg.')).toBeVisible();
  await expect(weight).toHaveAttribute('aria-invalid', 'true');
  await expectNoAccessibilityViolations(page);

  // A weight with a comma is saved; it shows as the latest and the prompt turns to "done".
  await weight.fill(WEIGHT_TYPED);
  await page.getByTestId('weigh-in-save').click();
  await expect(page.getByTestId('weigh-in-notice')).toHaveText('Saved.');
  await expect(page.getByTestId('weigh-in-latest')).toContainText(WEIGHT_SHOWN);
  await expect(page.getByTestId('weigh-in-done')).toBeVisible();
  await expect(page.getByTestId('weigh-in-due')).toBeHidden();
  await expectNoAccessibilityViolations(page);

  // The server has it: it is still there after a reload.
  await page.reload();
  await expect(page.getByTestId('weigh-in-latest')).toContainText(WEIGHT_SHOWN);
  await expect(page.getByTestId('weigh-in-done')).toBeVisible();
});
