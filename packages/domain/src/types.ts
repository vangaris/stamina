import type { BodyArea } from './enums/body-area.ts';
import type { Equipment } from './enums/equipment.ts';
import type { ExerciseLocation } from './enums/exercise-location.ts';
import type { ReferralKind } from './enums/referral-kind.ts';
import type { SessionSlot } from './enums/session-slot.ts';
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

/** What the exercise filter reads from an exercise. */
export interface ExerciseTags {
  /** Equipment needed beyond the body; empty means bodyweight. */
  equipment: readonly Equipment[];
  locations: readonly ExerciseLocation[];
  slots: readonly SessionSlot[];
  /** Every body area the exercise loads heavily. */
  highLoadAreas: readonly BodyArea[];
}

/** Every part is optional: an absent part does not narrow the result. */
export interface ExerciseFilter {
  /** What the person has: an exercise is kept only if all the equipment it needs is listed. Absent means no limit. */
  equipment?: readonly Equipment[];
  /** Where they train: an exercise is kept if it works in any of these. */
  locations?: readonly ExerciseLocation[];
  /** An exercise is kept if it fits any of these slots. */
  slots?: readonly SessionSlot[];
  /** Body areas to keep out: an exercise that loads any of them is never kept. */
  excludedAreas?: readonly BodyArea[];
}
