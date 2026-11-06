import type { ProfileAnswers } from '@stamina/contracts';
import { FAKE_AUTH, FAKE_INVITE } from '../config.ts';
import { checkInvite, saveProfile, verifyEmailCode } from '../index.ts';
import type { Services } from '../types.ts';
import { buildProfileAnswers } from './build-profile-answers.ts';
import { setupMediator } from './setup-mediator.ts';

const EMAIL = 'ada@example.com';

/** A mediator with a person signed in and a saved profile. */
export async function signedUp(
  answers: ProfileAnswers = buildProfileAnswers(),
  overrides: Partial<Services> = {},
) {
  const setup = setupMediator(overrides);
  await setup.mediator.send(verifyEmailCode(EMAIL, FAKE_AUTH.validCode));
  await setup.mediator.send(checkInvite(FAKE_INVITE.validCode));
  await setup.mediator.send(saveProfile(answers));
  return setup;
}
