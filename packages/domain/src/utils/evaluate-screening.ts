import { REFERRAL_QUESTIONS } from '../config.ts';
import { ReferralKind } from '../enums/referral-kind.ts';
import { ScreeningQuestion } from '../enums/screening-question.ts';
import { ScreeningStatus } from '../enums/screening-status.ts';
import type { ScreeningInput, ScreeningOutcome } from '../types.ts';

/**
 * The outcome of Screening, from the answers alone.
 *
 * - A yes to any referral question is `Referred`, with pregnancy wording when that is the
 *   question answered yes (pregnancy has no Limited path).
 * - Eating-disorder treatment turns Nutrition off but does not stop training.
 * - Bone, joint or muscle problems exclude the picked areas; nothing else changes.
 * - All no is `Cleared`.
 *
 * It never names a condition, scores a risk or issues clearance: it blocks, limits or refers.
 */
export function evaluateScreening({ answers, bodyAreas }: ScreeningInput): ScreeningOutcome {
  const referred = REFERRAL_QUESTIONS.some((question) => answers[question]);
  let referral: ReferralKind | null = null;
  if (referred) {
    referral = answers[ScreeningQuestion.Pregnancy] ? ReferralKind.Pregnancy : ReferralKind.General;
  }
  return {
    status: referred ? ScreeningStatus.Referred : ScreeningStatus.Cleared,
    referral,
    nutritionOff: answers[ScreeningQuestion.EatingDisorder],
    excludedAreas: answers[ScreeningQuestion.BoneJointMuscle] ? [...new Set(bodyAreas)] : [],
  };
}
