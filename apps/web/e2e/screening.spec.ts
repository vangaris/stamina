import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { expectNoAccessibilityViolations } from './support/onboarding-flow.ts';
import {
  acceptConsents,
  answerScreening,
  QUESTION,
  signUpToConsent,
} from './support/screening-flow.ts';

// Needs the local stack: the seed script for invites and the fake auth server for sign-in.
test.skip(!!process.env.PLAYWRIGHT_BASE_URL, 'needs the local stack with the seed script');

const DISCLAIMER =
  "Stamina gives general fitness and nutrition guidance for healthy adults. It is not a medical device and doesn't diagnose, treat or replace advice from a doctor, physiotherapist or dietitian. Stop and seek medical help if you feel unwell.";

test('the cleared path: consent, every question answered, then Today', async ({
  page,
}, testInfo) => {
  await signUpToConsent(page, testInfo.title);

  // The disclaimer is shown word for word, and both boxes start unticked.
  await expect(page.getByText(DISCLAIMER)).toBeVisible();
  const disclaimer = page.getByRole('checkbox', { name: /I have read and accept/ });
  const healthData = page.getByRole('checkbox', { name: /I agree that Stamina may process/ });
  await expect(disclaimer).not.toBeChecked();
  await expect(healthData).not.toBeChecked();
  await expect(page.getByText('Where it is kept: in the EU, encrypted.')).toBeVisible();
  await expect(page.getByText('It is never sent to AI providers or to analytics.')).toBeVisible();
  await expectNoAccessibilityViolations(page);

  // Each box is required on its own; nothing is sent until both are ticked.
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Accept this to continue.')).toBeVisible();
  await expect(page.getByText('Agree to this to continue.')).toBeVisible();
  await disclaimer.check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Agree to this to continue.')).toBeVisible();
  await expect(page).toHaveURL(/\/consent$/);
  await healthData.check();
  const posts: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/consent' && request.method() === 'POST') {
      posts.push(request.postData() ?? '');
    }
  });
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/screening$/);
  expect(posts.map((body) => JSON.parse(body))).toEqual([
    { purpose: 'disclaimer', locale: 'en' },
    { purpose: 'health-data', locale: 'en' },
  ]);

  // Nobody gets to Today without a Screening.
  await page.goto('/today');
  await expect(page).toHaveURL(/\/screening$/);

  // Ten questions and the starting level, none answered for the person.
  await expect(page.getByRole('radiogroup')).toHaveCount(11);
  await expect(page.getByText('If unsure, answer yes.')).toHaveCount(10);
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(0);
  await expectNoAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Choose yes or no.')).toHaveCount(11);
  await expect(page).toHaveURL(/\/screening$/);

  await answerScreening(page);
  await expect(page.getByText('Choose yes or no.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(
    page.getByRole('heading', { name: "Thanks, that's everything we need" }),
  ).toBeVisible();
  await expect(page.getByText('Get professional advice before training')).toHaveCount(0);
  await expectNoAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Continue to Today' }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

  // Done is done: the tabs open, and the consent and Screening addresses lead on to Today.
  await page.goto('/meals');
  await expect(page.getByRole('heading', { name: 'Meals' })).toBeVisible();
  await page.goto('/screening');
  await expect(page).toHaveURL(/\/today$/);
});

test('Nutrition off and an excluded area are explained, and training goes on', async ({
  page,
}, testInfo) => {
  await signUpToConsent(page, testInfo.title);
  await acceptConsents(page);

  await answerScreening(page, { yes: [QUESTION.eatingDisorder, QUESTION.boneJointMuscle] });
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Choose at least one area.')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Knee', exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText(/Nutrition is switched off for you/)).toBeVisible();
  await expect(
    page.getByText(/Get professional advice before training this area: knee\./),
  ).toBeVisible();
  await expectNoAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Continue to Today' }).click();
  await expect(page).toHaveURL(/\/today$/);
});

test('the referred path: a calm screen, export, then "a doctor has said I can train" and Limited mode', async ({
  page,
}, testInfo) => {
  await signUpToConsent(page, testInfo.title);
  await acceptConsents(page);

  await answerScreening(page, { yes: [QUESTION.heartCondition] });
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/referred$/);
  await expect(
    page.getByRole('heading', { name: "Let's check with a professional first" }),
  ).toBeVisible();
  await expect(page.getByText(/Please talk to a doctor before starting/)).toBeVisible();
  // It names no condition.
  await expect(page.getByText(/heart|cardiac|blood pressure/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Export my data' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete my data' })).toBeVisible();
  await expectNoAccessibilityViolations(page);

  // The export is a file the person keeps; it holds what they answered.
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export my data' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('stamina-export.json');
  const exported = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(exported.screenings[0].answers['heart-condition']).toBe(true);
  await expect(page.getByText('Your data was downloaded.')).toBeVisible();

  // No tab opens while Referred.
  await page.goto('/today');
  await expect(page).toHaveURL(/\/referred$/);

  await page.getByRole('button', { name: 'A doctor has said I can train' }).click();
  await expect(page.getByRole('heading', { name: 'Limited mode is on' })).toBeVisible();
  await expectNoAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Continue to Today' }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

  // Limited stays: Today opens again after a reload, and the referral screen leads back to it.
  await page.reload();
  await expect(page).toHaveURL(/\/today$/);
  await page.goto('/referred');
  await expect(page).toHaveURL(/\/today$/);
});

test('a pregnancy referral says "your doctor or midwife" and has no Limited path', async ({
  page,
}, testInfo) => {
  await signUpToConsent(page, testInfo.title);
  await acceptConsents(page);

  await answerScreening(page, { yes: [QUESTION.pregnancy] });
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/referred$/);
  await expect(page.getByText(/talk to your doctor or midwife before starting/)).toBeVisible();
  await expect(page.getByText(/pregnan/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'A doctor has said I can train' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Export my data' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete my data' })).toBeVisible();
  await expectNoAccessibilityViolations(page);
});

test('deleting my data asks first, then removes everything, signs out and goes to the start', async ({
  page,
}, testInfo) => {
  await signUpToConsent(page, testInfo.title);
  await acceptConsents(page);
  await answerScreening(page, { yes: [QUESTION.heartCondition] });
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/referred$/);

  await page.getByRole('button', { name: 'Delete my data' }).click();
  await expect(page.getByRole('heading', { name: 'Delete all your data?' })).toBeVisible();
  await expectNoAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Keep my data' }).click();
  await expect(page.getByRole('button', { name: 'Delete my data' })).toBeVisible();

  await page.getByRole('button', { name: 'Delete my data' }).click();
  await page.getByRole('button', { name: 'Yes, delete everything' }).click();

  await expect(page).toHaveURL(/\/start$/);
});
