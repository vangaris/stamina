import type { BodyHalf } from './enums/body-half.ts';
import type { ProgressionOutcome } from './enums/progression-outcome.ts';
import type { PickProblem } from './enums/pick-problem.ts';
import type { BodyArea } from './enums/body-area.ts';
import type { Emphasis } from './enums/emphasis.ts';
import type { Equipment } from './enums/equipment.ts';
import type { ExerciseLocation } from './enums/exercise-location.ts';
import type { Goal } from './enums/goal.ts';
import type { Intensity } from './enums/intensity.ts';
import type { LoadGuidance } from './enums/load-guidance.ts';
import type { MovementPattern } from './enums/movement-pattern.ts';
import type { PrescriptionUnit } from './enums/prescription-unit.ts';
import type { ReferralKind } from './enums/referral-kind.ts';
import type { SeasonKind } from './enums/season-kind.ts';
import type { SessionFocus } from './enums/session-focus.ts';
import type { SessionSlot } from './enums/session-slot.ts';
import type { ScreeningQuestion } from './enums/screening-question.ts';
import type { ScreeningStatus } from './enums/screening-status.ts';
import type { SportMovement } from './enums/sport-movement.ts';
import type { TrainingMode } from './enums/training-mode.ts';
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

/** What the generation engine reads from a Sport Profile; a full Sport Profile satisfies it. */
export interface SportDemands {
  /** Shares of effort (percent) that add up to 100. */
  energyMix: { aerobic: number; repeatedSprint: number; explosive: number };
  keyMovements: readonly SportMovement[];
  highLoadAreas: readonly BodyArea[];
  /** Hours after a hard Activity before a heavy Session of each body half. */
  recoveryWindowHours: { lower: number; upper: number };
  season: { kind: SeasonKind; months: readonly number[] };
}

/** What `chooseEmphasis` reads. */
export interface EmphasisInput {
  goal: Goal;
  /** `null` while the person's sport has no Sport Profile. */
  sport: SportDemands | null;
  mode: TrainingMode;
  /** The month the Block starts in, 1 to 12. */
  month: number;
}

/** What the engine reads from a library exercise. */
export interface PlannableExercise extends ExerciseTags {
  id: string;
  movementPattern: MovementPattern;
  /** Safe to prescribe by reps in reserve. */
  rirSuitable: boolean;
}

/** One day of the generated week. */
export interface WeekDate {
  /** `YYYY-MM-DD`, UTC. */
  date: string;
  weekday: Weekday;
}

/** What `placeSessions` needs. */
export interface PlacementInput {
  /**
   * The focus each of the week's Sessions has when it can be heavy, one entry per Session
   * (so its length is the Sessions per week). A `Recovery` entry is fixed: that Session is
   * never made heavy.
   */
  focuses: readonly SessionFocus[];
  availableDays: readonly Weekday[];
  /** The seven days of the week, in order. */
  week: readonly WeekDate[];
  /** Weekdays of known hard Activities; empty when none are known. */
  hardDays: readonly Weekday[];
  recoveryWindowHours: { lower: number; upper: number };
}

/** One Session's place in the week. */
export interface PlacedSession extends WeekDate {
  focus: SessionFocus;
}

/** What `prescribe` needs for one exercise. */
export interface PrescribeInput {
  slot: SessionSlot;
  emphasis: Emphasis;
  /** 1 to 4; 4 is the Deload. */
  weekInBlock: number;
  limited: boolean;
  /** Whether the exercise can be prescribed by reps in reserve. */
  rirSuitable: boolean;
  /** Whether the exercise needs equipment beyond the body. */
  needsEquipment: boolean;
}

/** How hard and how much of one exercise. */
export interface Prescription {
  sets: number;
  /** The rep range, or the hold in seconds when `unit` is seconds. */
  repMin: number;
  repMax: number;
  unit: PrescriptionUnit;
  /** Reps in reserve; `null` where effort is not rated. */
  rir: number | null;
  loadGuidance: LoadGuidance;
}

/** What `pickExercises` needs to fill one Session. */
export interface PickExercisesInput {
  library: readonly PlannableExercise[];
  equipment: readonly Equipment[];
  excludedAreas: readonly BodyArea[];
  focus: SessionFocus;
  minutes: number;
  limited: boolean;
  sport: SportDemands | null;
  /** Exercises already planned in earlier Sessions of this week. */
  usedInWeek: ReadonlySet<string>;
}

/** What `planFocuses` needs: the library and the person's limits, and how many Sessions. */
export interface PlanFocusesInput extends Omit<PickExercisesInput, 'focus' | 'usedInWeek'> {
  sessionsPerWeek: number;
}

/** One chosen exercise and the slot it fills. */
export interface PickedExercise {
  exerciseId: string;
  slot: SessionSlot;
}

/** What one slot of a Session needs and which exercises may fill it. */
export interface SlotSpec {
  slot: SessionSlot;
  /** How many exercises fill the slot. */
  count: number;
  /** Exercise ids that pass the equipment and excluded-area filter for this slot, in library order. */
  candidateIds: readonly string[];
}

/** What a picker needs to fill one Session: the slots with their candidates. */
export interface PickSpec {
  slots: readonly SlotSpec[];
  /** Candidate ids already used earlier in the week; a picker prefers others. */
  recentIds: readonly string[];
}

/** The result of `validatePicks`: the picks in the order they are done, or the first problem found. */
export type PickValidation =
  { valid: true; picks: PickedExercise[] } | { valid: false; problem: PickProblem };

/** How the person plays their sport, from the profile. */
export interface PlayPattern {
  playDays: readonly Weekday[];
  playVaries: boolean;
  playIntensity: Intensity;
}

/** What `plannedActivities` reads: how the person plays, and for how long. */
export interface PlannedActivityInput extends PlayPattern {
  playMinutes: number;
}

/** An Activity planned from the person's play days. */
export interface PlannedActivity {
  /** `YYYY-MM-DD`, UTC. */
  date: string;
  weekday: Weekday;
  minutes: number;
  intensity: Intensity;
}

/** Load on one day, from a Session or an Activity. */
export interface LoadEntry {
  /** `YYYY-MM-DD`. */
  date: string;
  load: number;
}

/** The Load of one 7-day week. */
export interface WeeklyLoad {
  /** The week's first day, `YYYY-MM-DD`. */
  startsOn: string;
  load: number;
}

/** This week against the person's own recent weeks. */
export interface LoadSummary {
  current: WeeklyLoad;
  /** The weeks before this one that count towards `average`, oldest first. */
  previous: WeeklyLoad[];
  /** The mean of `previous`, or null while there is none. */
  average: number | null;
}

/** Everything `generateWeek` reads. */
export interface GenerateWeekInput extends PlayPattern {
  goal: Goal;
  trainingWeek: TrainingWeek;
  /** `null` while the person's sport has no Sport Profile: generic demands apply. */
  sport: SportDemands | null;
  /** `Full` or `Limited`; a Referred person gets no Program. */
  mode: TrainingMode.Full | TrainingMode.Limited;
  excludedAreas: readonly BodyArea[];
  equipment: readonly Equipment[];
  library: readonly PlannableExercise[];
  /** 1 to 4. */
  weekInBlock: number;
  /** The first day of the week, `YYYY-MM-DD` UTC. */
  startsOn: string;
  /**
   * Exercises already chosen for the week's Sessions, by Session in date order; `null` or absent
   * means the rules pick that Session. A choice that does not pass `validatePicks` is ignored.
   */
  picks?: readonly (readonly PickedExercise[] | null)[];
}

/** One exercise of a generated Session with its prescription, in the order it is done. */
export interface GeneratedExercise extends Prescription {
  exerciseId: string;
  slot: SessionSlot;
}

export interface GeneratedSession extends PlacedSession {
  minutes: number;
  exercises: GeneratedExercise[];
}

export interface GeneratedWeek {
  emphasis: Emphasis;
  startsOn: string;
  weekInBlock: number;
  limited: boolean;
  sessions: GeneratedSession[];
}

/** One set as logged: what the person lifted and how hard it felt. */
export interface LoggedEffort {
  weightKg: number;
  /** Reps, or seconds for a timed hold. */
  reps: number;
  rpe: number;
}

/** What `progressLoad` reads: how an exercise was prescribed in its last finished Session, and what was logged. */
export interface ProgressLoadInput {
  half: BodyHalf;
  /** How the exercise is loaded now; only `RpeGuided` exercises carry a weight to progress. */
  loadGuidance: LoadGuidance;
  /** Sets prescribed in that Session. */
  sets: number;
  /** Top of the prescribed rep range. */
  repMax: number;
  /** Reps in reserve prescribed; `null` where effort is not rated. */
  rir: number | null;
  /** The sets logged for the exercise in that Session. */
  logged: readonly LoggedEffort[];
}

/** How the next Session treats an exercise's weight, and the weight to start with. */
export interface Progression {
  outcome: ProgressionOutcome;
  /** Kilograms, rounded to the nearest half. */
  suggestedWeightKg: number;
}
