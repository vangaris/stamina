import type { BodyArea } from './enums/body-area.ts';
import type { ReferralKind } from './enums/referral-kind.ts';
import type { ScreeningQuestion } from './enums/screening-question.ts';
import type { ScreeningStatus } from './enums/screening-status.ts';
import type { Weekday } from './enums/weekday.ts';

export interface EligibilityInput {
  birthYear: number;
  /** ISO 3166-1 alpha-2 country of residence. */
  country: string;
  /** The year "now" falls in; passed in so the rule stays pure. */
  currentYear: number;
}

export interface TrainingWeek {
  sessionsPerWeek: number;
  sessionMinutes: number;
  availableDays: readonly Weekday[];
}

/** What a person answers on the Screening page. */
export interface ScreeningInput {
  /** One yes/no per question; yes also covers "if unsure". */
  answers: Readonly<Record<ScreeningQuestion, boolean>>;
  /** The areas picked when `BoneJointMuscle` is yes; empty otherwise. */
  bodyAreas: readonly BodyArea[];
}

/** What Screening decides. It names no condition and scores no risk. */
export interface ScreeningOutcome {
  status: ScreeningStatus;
  /** Set exactly when `status` is `Referred`. */
  referral: ReferralKind | null;
  /** Eating-disorder treatment: Nutrition is off and the body-composition Goal is unavailable. */
  nutritionOff: boolean;
  /** Areas exercises must not load. */
  excludedAreas: readonly BodyArea[];
}

/** What `resolveTrainingMode` needs. */
export interface TrainingModeInput {
  status: ScreeningStatus;
  referral: ReferralKind | null;
  /** Whether the person stated "a doctor has said I can train" after this Screening. */
  doctorOk: boolean;
}
