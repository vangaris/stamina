import { expect, test, type Page } from '@playwright/test';
import pg from 'pg';
import { E2E_DATABASE_URL } from './support/e2e-stack.ts';
import { expectNoAccessibilityViolations } from './support/onboarding-flow.ts';
import { signUpToReveal } from './support/program-flow.ts';

// Needs the local stack: the seed script for invites, the fake auth server and the database.
test.skip(!!process.env.PLAYWRIGHT_BASE_URL, 'needs the local stack with the seed script');

const SET_RPE = 8;
const SESSION_RPE = 8;
const SESSION_LOAD = 360;
const SYNC_TIMEOUT_MS = 20_000;
/** A second tap within this time of a logged set is ignored (double-tap guard), so the journey waits it out. */
const TAP_GUARD_WAIT_MS = 700;
const JOURNEY_TIMEOUT_MS = 120_000;

/** How many rows the API's database holds for one Session (what the server received). */
async function serverRows(sessionId: string) {
  const client = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    const sets = await client.query(
      'select count(*)::int as n from set_log where session_id = $1',
      [sessionId],
    );
    const finishes = await client.query(
      'select rpe, minutes, load from session_log where session_id = $1',
      [sessionId],
    );
    return { sets: sets.rows[0].n as number, finishes: finishes.rows as unknown[] };
  } finally {
    await client.end();
  }
}

/** Logs every planned set with the default weight and reps, skipping the rest timer, up to the finish question. */
async function logEverySet(page: Page): Promise<number> {
  let logged = 0;
  const done = page.getByTestId('set-done');
  while (!(await page.getByTestId('finish-view').isVisible())) {
    // The first set of an exercise starts with no effort picked; later sets keep the last one.
    if (await done.isDisabled()) {
      await page.getByRole('radio', { name: String(SET_RPE), exact: true }).click();
    }
    await done.click();
    logged += 1;
    await page.waitForTimeout(TAP_GUARD_WAIT_MS);
    const skip = page.getByRole('button', { name: 'Skip rest' });
    await skip.click({ timeout: 500 }).catch(() => undefined);
  }
  return logged;
}

test('a Session logged with no signal is saved on the phone and reaches the server when it is back online', async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);
  await signUpToReveal(page, testInfo.title);
  await page.getByTestId('reveal-continue').click();
  await page.getByTestId('week-link').click();
  await expect(page).toHaveURL(/\/week$/);
  await expect(page.getByTestId('session-card').first()).toBeVisible();

  // Opened once with a connection, so it is on the phone; then back to the week.
  await page.getByTestId('session-start').first().click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
  const sessionId = page.url().split('/').pop()!;
  await expect(page.getByTestId('focus-view')).toBeVisible();
  await expectNoAccessibilityViolations(page);
  await page.goBack();
  await expect(page.getByTestId('session-card').first()).toBeVisible();

  // The signal goes (a gym basement). The Session opens from the phone and every set is logged.
  await context.setOffline(true);
  await page.getByTestId('session-start').first().click();
  await expect(page.getByTestId('focus-view')).toBeVisible();
  const logged = await logEverySet(page);
  expect(logged).toBeGreaterThan(0);

  await page.getByRole('radio', { name: String(SESSION_RPE), exact: true }).click();
  await page.getByTestId('finish-submit').click();
  await expect(page.getByTestId('done-load')).toContainText(`Load ${SESSION_LOAD}`);
  await expect(page.getByTestId('done-sync')).toContainText('Saved on this phone');
  await expectNoAccessibilityViolations(page);
  expect((await serverRows(sessionId)).sets).toBe(0);

  // The signal is back: everything arrives, once, and the finish with it.
  await context.setOffline(false);
  await expect
    .poll(async () => (await serverRows(sessionId)).sets, { timeout: SYNC_TIMEOUT_MS })
    .toBe(logged);
  await expect
    .poll(async () => (await serverRows(sessionId)).finishes, { timeout: SYNC_TIMEOUT_MS })
    .toEqual([{ rpe: SESSION_RPE, minutes: 45, load: SESSION_LOAD }]);

  // The week now shows it done, from the server's own record.
  await page.goto('/week');
  await expect(page.getByTestId('session-done').first()).toBeVisible();
  await expect(page.getByTestId('session-start')).toHaveCount(1);
});
