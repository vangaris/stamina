import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createInvites } from './support/create-invites.ts';
import { E2E_API_URL } from './support/e2e-stack.ts';

// Needs the local stack: the seed script for invites and the fake auth server for sign-in.
test.skip(!!process.env.PLAYWRIGHT_BASE_URL, 'needs the local stack with the seed script');

const OTP = '424242';
const ADULT_BIRTH_YEAR = '1990';
const UNKNOWN_CODE = 'ABCDEFGHJK';

/** One email per test: the fake auth server keeps its state per address across parallel tests. */
function uniqueEmail(testTitle: string): string {
  return `${testTitle.replace(/\W+/g, '-').toLowerCase()}-${Date.now()}@example.com`;
}

async function inviteIsUsable(page: Page, code: string): Promise<boolean> {
  const response = await page.request.post(`${E2E_API_URL}/invites/check`, { data: { code } });
  return ((await response.json()) as { valid: boolean }).valid;
}

/** Invite code, then sign in with the emailed code: lands on the first onboarding screen. */
async function startAndSignIn(page: Page, code: string, email: string) {
  await page.goto('/start');
  await page.getByLabel('Invite code').fill(code);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByRole('button', { name: 'Send code' }).click();
  await page.getByLabel(/6-digit code/).fill(OTP);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Tell us about you' })).toBeVisible();
}

async function answerAbout(
  page: Page,
  { needs, birthYear, country }: { needs: string; birthYear: string; country: string },
) {
  await page.getByRole('radio', { name: needs, exact: true }).click();
  await page.getByLabel('Birth year').fill(birthYear);
  await page.getByLabel('Country of residence').selectOption(country);
  await page.getByRole('button', { name: 'Continue' }).click();
}

async function answerSport(page: Page) {
  await expect(page.getByRole('heading', { name: 'Your sport' })).toBeVisible();
  await page.getByRole('radio', { name: 'Kitesurfing', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Sat', exact: true }).click();
  await page.getByRole('radio', { name: 'Hard', exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
}

async function answerGoal(page: Page, goal: string, button: 'Continue' | 'Finish') {
  await expect(page.getByRole('heading', { name: 'Your Goal' })).toBeVisible();
  await page.getByRole('radio', { name: goal, exact: true }).click();
  await page.getByRole('button', { name: button }).click();
}

async function expectNoAccessibilityViolations(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
}

const isProfilePost = (request: { url(): string; method(): string }) =>
  new URL(request.url()).pathname === '/profile' && request.method() === 'POST';

test('an invite code that is not valid is explained and does not go on to sign-in', async ({
  page,
}) => {
  await page.goto('/start');
  await expect(page.getByLabel('Invite code')).toBeFocused();

  await page.getByLabel('Invite code').fill(UNKNOWN_CODE);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(
    page.getByText('That invite code is not valid, or it has already been used.'),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/start$/);

  await page.getByLabel('Invite code').fill('nonsense');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(
    page.getByText('That invite code is not valid, or it has already been used.'),
  ).toBeVisible();

  await page.getByLabel('Invite code').fill('');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Enter your invite code.')).toBeVisible();
});

test('the invite screen has no accessibility violations and 44 px targets', async ({ page }) => {
  await page.goto('/start');
  await expect(page.getByRole('heading', { name: 'Stamina is invite-only for now' })).toBeVisible();

  await expectNoAccessibilityViolations(page);
  for (const name of ['Continue', 'I already have an account']) {
    expect((await page.getByRole('button', { name }).boundingBox())!.height).toBeGreaterThanOrEqual(
      44,
    );
  }
});

test('a valid code is accepted in any spelling and leads to sign-in', async ({ page }) => {
  const [code] = await createInvites();
  const spaced = `${code!.slice(0, 5)} - ${code!.slice(5).toLowerCase()}`;

  await page.goto('/start');
  await page.getByLabel('Invite code').fill(spaced);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/sign-in$/);
});

test('someone under 18 is told Stamina is for adults, nothing is sent and the invite stays usable', async ({
  page,
}, testInfo) => {
  const [code] = await createInvites();
  const posts: string[] = [];
  page.on('request', (request) => {
    if (isProfilePost(request)) posts.push(request.url());
  });
  await startAndSignIn(page, code!, uniqueEmail(testInfo.title));

  await answerAbout(page, {
    needs: 'Both',
    birthYear: String(new Date().getUTCFullYear() - 10),
    country: 'GR',
  });

  await expect(page.getByRole('heading', { name: 'Stamina is for adults' })).toBeVisible();
  await expectNoAccessibilityViolations(page);
  expect(posts).toEqual([]);
  expect(await inviteIsUsable(page, code!)).toBe(true);

  // They can correct a typo and go on.
  await page.getByRole('button', { name: 'Change my answers' }).click();
  await page.getByLabel('Birth year').fill(ADULT_BIRTH_YEAR);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Your sport' })).toBeVisible();
});

test('someone outside the EU/EEA is told where Stamina is available, nothing is sent and the invite stays usable', async ({
  page,
}, testInfo) => {
  const [code] = await createInvites();
  const posts: string[] = [];
  page.on('request', (request) => {
    if (isProfilePost(request)) posts.push(request.url());
  });
  await startAndSignIn(page, code!, uniqueEmail(testInfo.title));

  await answerAbout(page, { needs: 'Both', birthYear: ADULT_BIRTH_YEAR, country: 'US' });

  await expect(
    page.getByRole('heading', { name: 'Stamina is available in the EU/EEA for now' }),
  ).toBeVisible();
  await expectNoAccessibilityViolations(page);
  expect(posts).toEqual([]);
  expect(await inviteIsUsable(page, code!)).toBe(true);
});

test('a minor outside the EU/EEA is told about age, not about where they live', async ({
  page,
}, testInfo) => {
  const [code] = await createInvites();
  await startAndSignIn(page, code!, uniqueEmail(testInfo.title));

  await answerAbout(page, {
    needs: 'Both',
    birthYear: String(new Date().getUTCFullYear() - 10),
    country: 'US',
  });

  await expect(page.getByRole('heading', { name: 'Stamina is for adults' })).toBeVisible();
  await expect(page.getByText('EU/EEA')).toHaveCount(0);
});

test('the first screen names what is missing', async ({ page }, testInfo) => {
  const [code] = await createInvites();
  await startAndSignIn(page, code!, uniqueEmail(testInfo.title));

  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('Choose what you want from Stamina.')).toBeVisible();
  await expect(page.getByText('Enter the year you were born, like 1990.')).toBeVisible();
  await expect(page.getByText('Choose your country of residence.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tell us about you' })).toBeVisible();
});

test('the happy path: invite, sign-in, every screen, saved, Today; the invite is then used up', async ({
  page,
}, testInfo) => {
  const [code] = await createInvites();
  await startAndSignIn(page, code!, uniqueEmail(testInfo.title));

  // Screen 1: language and units are pre-filled from the phone (en-US: English, imperial) and editable.
  await expect(page.getByText('Step 1 of 4')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'English' })).toBeChecked();
  await expect(page.getByRole('radio', { name: /^Imperial/ })).toBeChecked();
  await page.getByRole('radio', { name: /^Metric/ }).click();
  await expect(page.getByRole('radio', { name: /^Metric/ })).toBeChecked();
  await expectNoAccessibilityViolations(page);
  await answerAbout(page, { needs: 'Both', birthYear: ADULT_BIRTH_YEAR, country: 'GR' });

  // Screen 2: sport, when you play, how long and how hard; hot conditions are announced.
  await expect(page.getByText('Step 2 of 4')).toBeVisible();
  await expect(
    page.getByText(
      'Hot conditions will be on by default for kitesurfing, windsurfing and beach volleyball.',
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Choose your sport.')).toBeVisible();
  await expect(page.getByText('Choose the days you play, or “It varies”.')).toBeVisible();
  await expectNoAccessibilityViolations(page);
  await answerSport(page);

  // Screen 3: Goal.
  await expectNoAccessibilityViolations(page);
  await answerGoal(page, 'Get stronger', 'Continue');

  // Screen 4: training week, validated before saving.
  await expect(page.getByText('Step 4 of 4')).toBeVisible();
  await page.getByRole('radio', { name: '45 min', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Mon', exact: true }).click();
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByText('Choose at least 3 days, one for each Session.')).toBeVisible();
  await page.getByRole('spinbutton', { name: 'Sessions per week' }).press('ArrowDown');
  await page.getByRole('checkbox', { name: 'Thu', exact: true }).click();
  await expectNoAccessibilityViolations(page);

  const saved = page.waitForResponse((response) => isProfilePost(response.request()));
  await page.getByRole('button', { name: 'Finish' }).click();
  const response = await saved;

  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({
    status: 'saved',
    profile: {
      needs: 'both',
      birthYear: 1990,
      country: 'GR',
      sport: { kind: 'launch', sport: 'kitesurfing' },
      playDays: ['sat'],
      playVaries: false,
      playIntensity: 'hard',
      goal: 'strength',
      trainingWeek: { sessionsPerWeek: 2, sessionMinutes: 45, availableDays: ['mon', 'thu'] },
      locale: 'en',
      units: 'metric',
      hotConditionsDefault: true,
    },
  });
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

  // Redeemed when the profile was first saved, not before.
  expect(await inviteIsUsable(page, code!)).toBe(false);
  await page.goto('/start');
  await page.getByLabel('Invite code').fill(code!);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(
    page.getByText('That invite code is not valid, or it has already been used.'),
  ).toBeVisible();

  // Signed in with a profile: the onboarding address goes straight to Today.
  await page.goto('/onboarding');
  await expect(page).toHaveURL(/\/today$/);
});

test('food only skips the training week and saves after the Goal', async ({ page }, testInfo) => {
  const [code] = await createInvites();
  const bodies: Record<string, unknown>[] = [];
  page.on('request', (request) => {
    if (isProfilePost(request)) bodies.push(request.postDataJSON() as Record<string, unknown>);
  });
  await startAndSignIn(page, code!, uniqueEmail(testInfo.title));

  await answerAbout(page, {
    needs: 'What to eat and drink',
    birthYear: ADULT_BIRTH_YEAR,
    country: 'PT',
  });
  await expect(page.getByText('Step 2 of 3')).toBeVisible();
  await answerSport(page);
  await expect(page.getByText('Step 3 of 3')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' })).toHaveCount(0);
  await answerGoal(page, 'General fitness', 'Finish');

  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('heading', { name: 'Your training week' })).toHaveCount(0);
  expect(bodies).toHaveLength(1);
  expect(bodies[0]).toMatchObject({ needs: 'food', goal: 'general-fitness' });
  expect(bodies[0]).not.toHaveProperty('trainingWeek');
});

test('"Other…" asks for the sport name and "It varies" replaces the play days', async ({
  page,
}, testInfo) => {
  const [code] = await createInvites();
  const bodies: Record<string, unknown>[] = [];
  page.on('request', (request) => {
    if (isProfilePost(request)) bodies.push(request.postDataJSON() as Record<string, unknown>);
  });
  await startAndSignIn(page, code!, uniqueEmail(testInfo.title));
  await answerAbout(page, { needs: 'What to eat and drink', birthYear: '1985', country: 'DE' });

  await page.getByRole('radio', { name: 'Other…', exact: true }).click();
  await page.getByRole('checkbox', { name: 'It varies' }).check();
  await page.getByRole('radio', { name: 'Easy', exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Tell us the name of your sport.')).toBeVisible();

  await page.getByLabel('Name of your sport').fill('Surf-ski');
  await page.getByRole('checkbox', { name: 'Tue', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'It varies' })).not.toBeChecked();
  await page.getByRole('checkbox', { name: 'It varies' }).check();
  await expect(page.getByRole('checkbox', { name: 'Tue', exact: true })).not.toBeChecked();
  await page.getByRole('button', { name: 'Continue' }).click();
  await answerGoal(page, 'Body composition', 'Finish');

  await expect(page).toHaveURL(/\/today$/);
  expect(bodies[0]).toMatchObject({
    sport: { kind: 'other', name: 'Surf-ski' },
    playVaries: true,
    playDays: [],
  });
});

test('a profile that was already saved goes straight to Today after signing in', async ({
  page,
}, testInfo) => {
  const [code] = await createInvites();
  const email = uniqueEmail(testInfo.title);
  await startAndSignIn(page, code!, email);
  await answerAbout(page, {
    needs: 'What to eat and drink',
    birthYear: ADULT_BIRTH_YEAR,
    country: 'IT',
  });
  await answerSport(page);
  await answerGoal(page, 'General fitness', 'Finish');
  await expect(page).toHaveURL(/\/today$/);

  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.goto('/sign-in');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByRole('button', { name: 'Send code' }).click();
  await page.getByLabel(/6-digit code/).fill(OTP);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/today$/);
});

test('signing in without an invite asks for one first', async ({ page }, testInfo) => {
  await page.goto('/sign-in');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(uniqueEmail(testInfo.title));
  await page.getByRole('button', { name: 'Send code' }).click();
  await page.getByLabel(/6-digit code/).fill(OTP);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/start$/);
  await expect(page.getByRole('heading', { name: 'Stamina is invite-only for now' })).toBeVisible();
});

test('opening the onboarding address while signed out goes to the invite screen', async ({
  page,
}) => {
  await page.goto('/onboarding');

  await expect(page).toHaveURL(/\/start$/);
});

test('an invite the server turns down sends the person back to the invite screen', async ({
  page,
}, testInfo) => {
  const [code] = await createInvites();
  await startAndSignIn(page, code!, uniqueEmail(testInfo.title));
  // Another person redeems the code while this one is still answering.
  await page.evaluate(() => localStorage.setItem('stamina.invite-code', 'ABCDEFGHJK'));
  await answerAbout(page, {
    needs: 'What to eat and drink',
    birthYear: ADULT_BIRTH_YEAR,
    country: 'ES',
  });
  await answerSport(page);
  await answerGoal(page, 'General fitness', 'Finish');

  await expect(page).toHaveURL(/\/start\?notice=invite-rejected$/);
  await expect(
    page.getByText('Your invite code could not be used. Enter a valid code to continue.'),
  ).toBeVisible();
});

test.describe('a phone set to Greek', () => {
  test.use({ locale: 'el-GR' });

  test('shows the invite and first screens in Greek, with Greek country names', async ({
    page,
  }, testInfo) => {
    const [code] = await createInvites();
    await page.goto('/start');
    await expect(
      page.getByRole('heading', { name: 'Το Stamina είναι προς το παρόν μόνο με πρόσκληση' }),
    ).toBeVisible();
    await expectNoAccessibilityViolations(page);
    await page.getByLabel('Κωδικός πρόσκλησης').fill(code!);
    await page.getByRole('button', { name: 'Συνέχεια' }).click();

    await page
      .getByRole('textbox', { name: 'Email', exact: true })
      .fill(uniqueEmail(testInfo.title));
    await page.getByRole('button', { name: 'Στείλε κωδικό' }).click();
    await page.getByLabel(/6ψήφιος κωδικός/).fill(OTP);
    await page.getByRole('button', { name: 'Σύνδεση' }).click();

    await expect(page.getByRole('heading', { name: 'Πες μας για εσένα' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Ελληνικά' })).toBeChecked();
    await expect(page.getByLabel('Χώρα διαμονής').locator('option[value="GR"]')).toHaveText(
      'Ελλάδα',
    );
    await expectNoAccessibilityViolations(page);
  });
});
