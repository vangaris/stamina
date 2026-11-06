import { ScreeningRejection } from '@stamina/contracts';
import { BodyArea, ConsentPurpose, SCREENING_QUESTIONS, ScreeningQuestion } from '@stamina/domain';
import { RoutePath } from '../../enums/route-path.ts';
import { SafetyMessageKey } from './enums/safety-message-key.ts';
import { ScreeningField } from './enums/screening-field.ts';
import type { ConsentErrors } from './types.ts';

/** The consents in the order the screen asks for them; each is its own call. */
export const CONSENT_PURPOSES: readonly ConsentPurpose[] = [
  ConsentPurpose.Disclaimer,
  ConsentPurpose.HealthData,
];

/** The message beside each consent box that is still unticked. */
export const CONSENT_REQUIRED_KEYS: Record<ConsentPurpose, SafetyMessageKey> = {
  [ConsentPurpose.Disclaimer]: SafetyMessageKey.DisclaimerRequired,
  [ConsentPurpose.HealthData]: SafetyMessageKey.HealthDataRequired,
};

/** Which entry of the consent errors belongs to each consent box. */
export const CONSENT_ERROR_FIELDS: Record<ConsentPurpose, keyof ConsentErrors> = {
  [ConsentPurpose.Disclaimer]: 'disclaimer',
  [ConsentPurpose.HealthData]: 'healthData',
};

/** Where a person goes when the server refuses their Screening: back to the step it needs first. */
export const SCREENING_REJECTION_ROUTES: Record<ScreeningRejection, RoutePath> = {
  [ScreeningRejection.ConsentMissing]: RoutePath.Consent,
  [ScreeningRejection.ProfileMissing]: RoutePath.Onboarding,
  [ScreeningRejection.NoScreening]: RoutePath.Screening,
};

/** The ten questions in page order, then the starting-level question after them. */
export const QUESTIONS: readonly ScreeningQuestion[] = SCREENING_QUESTIONS;

/** Body areas in the order the picker shows them. */
export const BODY_AREAS: readonly BodyArea[] = Object.values(BodyArea);

/** The question whose yes opens the body-area picker. */
export const AREA_QUESTION = ScreeningQuestion.BoneJointMuscle;

/** DOM id of each answer's wrapper, so the page can scroll to the first one missing. */
export const FIELD_ID_PREFIX = 'screening-field-';

/** What the Referred screen offers as a download. */
export const EXPORT_FILE_NAME = 'stamina-export.json';
export const EXPORT_MIME_TYPE = 'application/json';

/** Answers that count as missing, in the order the page shows them (used to find the first). */
export const FIELD_ORDER: readonly (ScreeningQuestion | ScreeningField)[] = [
  ...QUESTIONS.flatMap((question): (ScreeningQuestion | ScreeningField)[] =>
    question === AREA_QUESTION ? [question, ScreeningField.BodyAreas] : [question],
  ),
  ScreeningField.StartingLevel,
];
