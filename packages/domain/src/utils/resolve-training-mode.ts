import { ReferralKind } from '../enums/referral-kind.ts';
import { ScreeningStatus } from '../enums/screening-status.ts';
import { TrainingMode } from '../enums/training-mode.ts';
import type { TrainingModeInput } from '../types.ts';

/**
 * What training is allowed after Screening. A Referred person who states "a doctor has said I
 * can train" gets `Limited`; a pregnant person never does. Stamina records the statement and
 * never issues clearance.
 */
export function resolveTrainingMode({
  status,
  referral,
  doctorOk,
}: TrainingModeInput): TrainingMode {
  if (status === ScreeningStatus.Cleared) return TrainingMode.Full;
  if (doctorOk && referral === ReferralKind.General) return TrainingMode.Limited;
  return TrainingMode.Referred;
}
