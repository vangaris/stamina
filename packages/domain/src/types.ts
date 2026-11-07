import type { Allergen } from './enums/allergen.ts';
import type { Origin } from './enums/origin.ts';
import type { BodyDirection } from './enums/body-direction.ts';
import type { MealSlot } from './enums/meal-slot.ts';
import type { CookingEffort } from './enums/cooking-effort.ts';
import type { EatingPattern } from './enums/eating-pattern.ts';
import type { DayType } from './enums/day-type.ts';
import type { EnergySex } from './enums/energy-sex.ts';
import type { EverydayActivity } from './enums/everyday-activity.ts';
import type { TrainingKind } from './enums/training-kind.ts';
import type { AdaptationChangeKind } from './enums/adaptation-change-kind.ts';
import type { AdaptationRule } from './enums/adaptation-rule.ts';
import type { AdaptationStatus } from './enums/adaptation-status.ts';
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
import type { StopAction } from './enums/stop-action.ts';
import type { VerdictKind } from './enums/verdict-kind.ts';
import type { StopFlag } from './enums/stop-flag.ts';
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

/** What reporting a stop flag does (`STOP_FLAG_EFFECTS`). */
export interface StopFlagEffect {
  action: StopAction;
  /** Show the local emergency number with the stop message. */
  showEmergency: boolean;
  /** The Screening questions asked again after the report. */
  recheck: readonly ScreeningQuestion[];
}

/** A reported stop flag, as the rules read it. */
export interface StoredStopFlag {
  flag: StopFlag;
  /** The person's calendar day when reported, `YYYY-MM-DD`. */
  date: string;
  /** The body area, for new pain; null for every other flag. */
  area: BodyArea | null;
  /** ISO moment reported. */
  reportedAt: string;
  /** ISO moment the person confirmed a doctor had seen or cleared them; null while open. */
  confirmedAt: string | null;
}

/** What the reported stop flags add up to (`resolveStopState`). */
export interface StopState {
  /** The distinct flags that still pause training, in the order reported. */
  pausing: StopFlag[];
  /** The day of the latest fever: no training that day. */
  restOn: string | null;
  /** The areas of every reported new pain. */
  excludedAreas: BodyArea[];
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
  /** Reps in reserve added to a rated exercise (never past `MAX_RIR`); absent means none. */
  rirBoost?: number;
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

/** What `weekVerdict` weighs for the week that holds today. */
export interface WeekVerdictInput {
  /** Load already done this week (Sessions plus Activities). */
  done: number;
  /** Extra Load still to come this week: the Sessions not finished and the planned Activities not logged on a play day from today on. */
  planned: number;
  /** The person's average of the weeks before, or null while there is none. */
  average: number | null;
  /** Sessions dated before today this week that are not finished; any makes the person behind. */
  sessionsMissed: number;
}

/** A Session as Progress counts it. */
export interface ProgressSession {
  /** The day it is planned for, `YYYY-MM-DD`. */
  date: string;
  /** Its week of the Block (1 to `WEEKS_IN_BLOCK`); sets the effort a planned Session counts at. */
  weekInBlock: number;
  minutes: number;
  finished: boolean;
}

/** An Activity as Progress counts it. */
export interface ProgressActivity {
  date: string;
  /** The day was one of the person's play days when it was logged. */
  planned: boolean;
}

/** The Load of one week: `done` so far, and the `planned` extra still to come. */
export interface ProgressWeekLoad {
  startsOn: string;
  done: number;
  planned: number;
}

/** The week that holds today against the person's own usual (what `summariseProgress` returns). */
export interface ProgressSummary {
  weekStartsOn: string;
  /** `planned` is every Session the week has, finished or not. */
  sessions: { done: number; planned: number };
  /** `logged` is every Activity logged in the week; `planned` the play days it has. */
  activities: { logged: number; planned: number };
  /** The weeks the average covers, oldest first, then this week last. */
  weeks: ProgressWeekLoad[];
  average: number | null;
  verdict: {
    kind: VerdictKind;
    /** The week's Load as the verdict weighed it: done plus planned. */
    load: number;
    average: number | null;
    sessionsDone: number;
    sessionsPlanned: number;
  };
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
  /**
   * Reps in reserve added to every rated exercise, never past `MAX_RIR`; absent means none. A
   * restarted Block asks for `RESTART_RIR_STEP`.
   */
  rirBoost?: number;
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

/** A Session revision an Adaptation was raised on and applies to. */
export interface SessionRevisionRef {
  sessionId: string;
  revision: number;
}

/** What accepting an Adaptation changes. `kind` says which; days are `YYYY-MM-DD` UTC. */
export type AdaptationChange =
  | { kind: AdaptationChangeKind.MoveSession; sessionId: string; from: string; to: string }
  | { kind: AdaptationChangeKind.SwapToRecovery; sessionId: string }
  | { kind: AdaptationChangeKind.DropSet; sessionId: string }
  | { kind: AdaptationChangeKind.LightenSession; sessionId: string }
  | {
      kind: AdaptationChangeKind.SwapExercises;
      sessionId: string;
      /** The targeted body areas the replaced exercises loaded. */
      areas: BodyArea[];
    }
  | { kind: AdaptationChangeKind.DeloadWeek; sessionIds: string[] }
  | {
      kind: AdaptationChangeKind.RepeatWeek;
      /** The first day of the repeated week: tomorrow. */
      startsOn: string;
      /** The week of the Block that is repeated, 1 to 4. */
      weekInBlock: number;
    }
  | { kind: AdaptationChangeKind.RestartBlock; startsOn: string };

/**
 * The numbers a reason template is filled with, by name. Whole numbers only: the reason is plain
 * numbers, never text. Keys per rule (see `proposeAdaptations`):
 * - `UnplannedActivity`: `load`, `minutes`, `hours` (from the Activity's day to the Session's), `windowHours`
 * - `PoorCheckin`: `sleep`, `soreness`, `energy`
 * - `SoreArea`: `soreness`
 * - `DeloadLoad`: `load` (this week so far), `previousLoad` (last week), `average`, `percent` (the limit, 130)
 * - `DeloadCheckins`: `count`, `days`
 * - `DeloadEffort`: `sessions`, `margin`
 * - `RepeatWeek`: `missed`, `weekInBlock`
 * - `RestartBlock`: `daysOff`
 */
export type AdaptationReasonParams = Readonly<Record<string, number>>;

/** An Adaptation the rules raise, before it is stored. */
export interface AdaptationProposal {
  ruleId: AdaptationRule;
  /** Names the facts it was raised on (an Activity id, a Check-in day, a week), so the same facts raise it once. */
  triggerKey: string;
  /** 1 the first time; a declined Deload asked again carries 2, 3 ... */
  ask: number;
  change: AdaptationChange;
  params: AdaptationReasonParams;
  /** The Session revisions the change applies to; accepting is refused when any is no longer the current, unfinished one. */
  basis: SessionRevisionRef[];
  /** The last day (`YYYY-MM-DD`) the suggestion is still worth showing, or `null` until used or declined. */
  validUntil: string | null;
}

/** A Session as the Adaptation rules see it: a current (not superseded) revision. */
export interface AdaptationSession extends GeneratedSession {
  id: string;
  revision: number;
  /** It has a finish record. */
  finished: boolean;
  /** It has at least one logged set (a finished Session has). Started Sessions are never revised. */
  started: boolean;
}

/** A finished Session: when, and how hard it felt against how hard it was meant to. */
export interface FinishedSessionFact {
  /** The Session's planned day. */
  date: string;
  /** Session RPE the person gave. */
  rpe: number;
  /** The lowest reps in reserve the Session prescribed; `null` when it rated no exercise. The target RPE is `FAILURE_RPE` minus this. */
  lowestRir: number | null;
  /** Finished order, oldest first among equal days. */
  finishedAt: string;
}

/** An Activity as the rules see it. */
export interface ActivityFact {
  id: string;
  date: string;
  intensity: Intensity;
  minutes: number;
  load: number;
  /** It matched the person's play days when it was logged. */
  planned: boolean;
}

/** A Check-in as the rules see it. */
export interface CheckinFact {
  id: string;
  date: string;
  sleep: number;
  soreness: number;
  energy: number;
}

/** An Adaptation already stored, for one rule and trigger. */
export interface AdaptationHistoryEntry {
  ruleId: AdaptationRule;
  triggerKey: string;
  ask: number;
  status: AdaptationStatus;
  /** ISO instant of the decision; `null` while pending. */
  decidedAt: string | null;
  /** The Session revisions it applies to and its last day: a pending one lapses with them. */
  basis: SessionRevisionRef[];
  validUntil: string | null;
}

/** What `generateWeek` reads except the week itself: where the Block is, the start day, picks, and RIR boost. */
export type GenerationBasis = Omit<
  GenerateWeekInput,
  'weekInBlock' | 'startsOn' | 'picks' | 'rirBoost'
>;

/** Everything `proposeAdaptations` and `applyAdaptation` read, gathered by the server for one user. */
export interface AdaptationContext {
  /** The person's day, `YYYY-MM-DD` UTC, and the instant it was read at (ISO). */
  today: string;
  now: string;
  /** The current Program week: its first day and its week of the Block. */
  weekStartsOn: string;
  weekInBlock: number;
  /** The first Block's first day: the anchor weekly Load counts from. */
  programStartsOn: string;
  /** The current (not superseded) Sessions of the current week, by date. */
  sessions: readonly AdaptationSession[];
  /** Every finished Session of the Program, any week. */
  finished: readonly FinishedSessionFact[];
  /** Activities dated within `ADAPTATION_LOOKBACK_DAYS` of today, or later. */
  activities: readonly ActivityFact[];
  /** Check-ins dated within `ADAPTATION_LOOKBACK_DAYS` of today. */
  checkins: readonly CheckinFact[];
  /** Every Session and Activity Load entry of the Program (for the weekly Load). */
  loadEntries: readonly LoadEntry[];
  /**
   * What generated the Program, as it is now: the play pattern, training week, Sport Profile,
   * mode, equipment, library, and excluded areas (Screening's plus those of reported new pain).
   * A repeated week or restarted Block is `generateWeek` over this.
   */
  generation: GenerationBasis;
  /** Every Adaptation stored for the user. */
  history: readonly AdaptationHistoryEntry[];
}

/** One Session as an Adaptation leaves it, ready to store as a new revision of `supersedes`. */
export interface RevisedSession extends GeneratedSession {
  /** The id of the revision this one replaces; `null` for a Session of a regenerated week. */
  supersedes: string | null;
}

/**
 * What accepting an Adaptation stores. `block` is `null` when the Sessions stay in the current
 * Block (move, swap, lighten, Deload); a repeated week or restarted Block gets a new Block, and
 * `supersedes` lists every unfinished Session of the current week it replaces.
 */
export interface AppliedAdaptation {
  block: {
    emphasis: Emphasis;
    /** The first day of the week: the Block's `startsOn` plus `(weekInBlock - 1) * 7` days. */
    startsOn: string;
    weekInBlock: number;
    limited: boolean;
  } | null;
  supersedes: string[];
  sessions: RevisedSession[];
}

/** One Session or Activity of a day, as the nutrition targets see it. */
export interface TrainingBlock {
  kind: TrainingKind;
  minutes: number;
  mets: number;
  hot: boolean;
  hard: boolean;
}

export interface DayTargetsInput {
  sex: EnergySex;
  ageYears: number;
  heightCm: number;
  /** The basis weight the targets are computed from. */
  weightKg: number;
  everydayActivity: EverydayActivity;
  /** `null` is maintenance. */
  bodyDirection: BodyDirection | null;
  trainings: readonly TrainingBlock[];
  /** The rate check halves a fat-loss deficit. */
  deficitHalved: boolean;
}

export interface DayTargets {
  dayType: DayType;
  restingKcal: number;
  energyKcal: number;
  /** The deficit applied (0 or negative). */
  deficitKcal: number;
  gainKcal: number;
  /** The target would have gone below resting energy and was raised to it. */
  floorApplied: boolean;
  deficitHalved: boolean;
  proteinG: number;
  carbsG: number;
  fatG: number;
  drinksMl: number;
  drinkCapApplied: boolean;
  drinkToThirst: boolean;
  preActivityMl: { min: number; max: number } | null;
  electrolyteNote: boolean;
  duringCarbsGPerHour: { min: number; max: number } | null;
}

export interface WeeklyWeight {
  /** The weigh-in's own date, `YYYY-MM-DD`. */
  date: string;
  weightKg: number;
}

export interface RateCheckResult {
  deficitHalved: boolean;
  prompt: boolean;
  /** The loss of the latest interval as a percent (negative for a gain); `null` without one. */
  weeklyLossPct: number | null;
}

export interface MealSlotTime {
  slot: MealSlot;
  /** Minute of the day. */
  at: number;
}

export interface RestingEnergyInput {
  sex: EnergySex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
}

/** The languages ingredient names are shipped in. */
export type NameLocale = 'en' | 'el';

export interface LocalisedName {
  en: string;
  el: string;
}

export interface UnitName {
  one: string;
  other: string;
}

export interface NutrientsPer100g {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** A household measure: how many grams ONE unit weighs, and its name in each language. */
export interface IngredientUnit {
  grams: number;
  names: Record<NameLocale, UnitName>;
}

export interface Ingredient {
  /** Kebab-case, unique across the vocabulary. */
  id: string;
  origin: Origin;
  names: LocalisedName;
  allergens: Allergen[];
  per100g: NutrientsPer100g;
  /** One to three household measures; the first is the default. */
  units: IngredientUnit[];
}

export interface PortionDescription {
  /** E.g. "2 tablespoons (20 g)". */
  text: string;
  /** The amount as a line that names the food: "2 tablespoons olive oil (20 g)", "2.5 eggs (120 g)", "20 g olive oil". */
  line: string;
  /** Number of household units, or the grams when `unit` is "g". */
  units: number;
  unit: string;
}

/** One ingredient of a template at its base amount. */
export interface TemplateIngredient {
  ingredientId: string;
  grams: number;
}

/**
 * A fixed meal written in ingredient ids. Allergens and origins are derived from the ingredients,
 * never stored; `pattern` is only the group the template was written for.
 */
export interface MealTemplate {
  /** `<pattern>-<slot>-<n>`, unique across the templates. */
  id: string;
  pattern: EatingPattern;
  slot: MealSlot;
  effort: CookingEffort;
  names: LocalisedName;
  ingredients: TemplateIngredient[];
}

/** A slot's share of the day's targets. */
export interface SlotTargets {
  slot: MealSlot;
  /** Minute of the day. */
  at: number;
  proteinG: number;
  carbsG: number;
  kcal: number;
}

/** What the rules need of the day's targets to split them across the meals. */
export type SlotTargetsDay = Pick<DayTargets, 'proteinG' | 'carbsG' | 'energyKcal'>;

/** A template scaled to a slot; names and household measures are rendered from domain data. */
export interface MealIdea {
  templateId: string;
  portions: { ingredientId: string; grams: number }[];
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** The person facts a template must respect. */
export interface TemplateEligibilityInput {
  pattern: EatingPattern;
  allergens: readonly Allergen[];
  dislikes: readonly string[];
}

export interface PickTemplateInput {
  candidates: readonly MealTemplate[];
  effort: CookingEffort;
  /** Days since a fixed date; the same day always picks the same template. */
  dayNumber: number;
  /** Position of the slot in the day. */
  slotIndex: number;
  /** How many slots of this kind the day has (two snacks on five meals). */
  slotsOfKind: number;
  /** Ids of the templates already given to other slots of the day; avoided while another fits. */
  taken: ReadonlySet<string>;
}

export interface MealIdeasInput extends TemplateEligibilityInput {
  /** The day the ideas are for, `YYYY-MM-DD`. */
  date: string;
  effort: CookingEffort;
  mealsPerDay: number;
  targets: SlotTargetsDay;
}
