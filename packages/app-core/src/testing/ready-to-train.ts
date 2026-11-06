import type { ProfileAnswers } from '@stamina/contracts';
import { ConsentPurpose, type ScreeningQuestion } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { grantConsent, saveScreening } from '../index.ts';
import type { Services } from '../types.ts';
import { buildScreeningSubmission } from './build-screening-submission.ts';
import { signedUp } from './signed-up.ts';

/** A signed-up mediator that gave both consents and took the Screening (answering yes to `yes`). */
export async function readyToTrain(
  answers?: ProfileAnswers,
  yes: ScreeningQuestion[] = [],
  overrides: Partial<Services> = {},
) {
  const setup = await signedUp(answers, overrides);
  for (const purpose of Object.values(ConsentPurpose)) {
    await setup.mediator.send(grantConsent({ purpose, locale: Locale.En }));
  }
  await setup.mediator.send(saveScreening(buildScreeningSubmission(yes)));
  return setup;
}
