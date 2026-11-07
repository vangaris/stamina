export {
  ADAPTATION_LOOKBACK_DAYS,
  ADAPTATION_REASK_DAYS,
  DAYS_OFF_TO_RESTART,
  DELOAD_EFFORT_MARGIN,
  DELOAD_EFFORT_SESSIONS,
  DELOAD_LOAD_FACTOR,
  DELOAD_LOAD_WEEKS,
  DELOAD_POOR_CHECKIN_DAYS,
  DELOAD_POOR_CHECKINS,
  DELOAD_SET_FACTOR,
  DELOAD_WEEK_IN_BLOCK,
  LIGHTER_RIR_STEP,
  LIGHTER_SETS_STEP,
  MISSED_SESSIONS_TO_REPEAT,
  MOVE_SESSION_OFFSETS,
  POOR_CHECKIN_ANSWERS,
  POOR_CHECKIN_SCORE,
  RESTART_RIR_STEP,
  SORE_AREA_SORENESS,
  ADULT_AGE,
  DAYS_IN_WEEK,
  LIMITED_RIR_FLOOR,
  RULES_VERSION,
  WEEKS_IN_BLOCK,
  CONSENT_TEXT_VERSIONS,
  DEFAULT_EQUIPMENT,
  ENERGY_MIX_TOTAL,
  CARBS_G_PER_KG,
  DRINKS_BASE_ML,
  DRINKS_MAX_EXERCISE_ML_PER_HOUR,
  DRINKS_ML_PER_HOT_TRAINING_HOUR,
  DRINKS_ML_PER_TRAINING_HOUR,
  DURING_CARBS_G_PER_HOUR,
  DURING_CARBS_MINUTES,
  ELECTROLYTE_NOTE_MINUTES,
  EVERYDAY_ACTIVITY_FACTOR,
  FALLBACK_METS_PER_INTENSITY,
  FAT_LOSS_DEFICIT_HALVED_KCAL,
  FAT_LOSS_DEFICIT_KCAL,
  FAT_MAX_ENERGY_SHARE,
  FAT_MIN_ENERGY_SHARE,
  MAX_DISLIKE_LENGTH,
  MAX_DISLIKES,
  PORTION_UNIT_STEP,
  MAX_HEIGHT_CM,
  MAX_MEALS_PER_DAY,
  MEAL_SHARES,
  MEAL_TIMES,
  MIN_HEIGHT_CM,
  MIN_MEALS_PER_DAY,
  MUSCLE_GAIN_SURPLUS_KCAL,
  PRE_ACTIVITY_ML_PER_KG,
  PROTEIN_G_PER_KG,
  PROTEIN_G_PER_KG_LOSING_FAT,
  RATE_CHECK_INTERVALS_TO_HALVE,
  RATE_CHECK_INTERVALS_TO_PROMPT,
  RATE_CHECK_LOSS_PCT,
  RECALCULATE_AT_KG_CHANGE,
  RESTING_SEX_CONSTANT,
  SESSION_MET,
  EXERCISE_IMAGE_ORIGIN,
  COUNTRY_CODES,
  EEA_COUNTRY_CODES,
  HOT_DEFAULT_SPORTS,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_INPUT_MAX_LENGTH,
  INVITE_CODE_LENGTH,
  MAX_KEY_MOVEMENTS,
  MAX_METS,
  MAX_PLAY_MINUTES,
  MAX_LOGGED_REPS,
  MAX_LOGGED_SETS,
  MAX_RIR,
  MAX_SESSION_MINUTES,
  MAX_SESSION_RPE,
  MAX_SET_RPE,
  ACTIVITY_RPE_BY_INTENSITY,
  LOAD_AVERAGE_WEEKS,
  MAX_BODY_WEIGHT_KG,
  MIN_BODY_WEIGHT_KG,
  VOLUME_FLEX,
  EMERGENCY_NUMBER,
  MAX_ACTIVITY_FUTURE_DAYS,
  MAX_WEIGH_IN_PAST_DAYS,
  MAX_CHECKIN_SCORE,
  MIN_CHECKIN_SCORE,
  STOP_FLAG_EFFECTS,
  PAUSING_STOP_ACTIONS,
  MAX_WEIGHT_KG,
  MIN_SESSION_RPE,
  MIN_SET_RPE,
  MAX_RECOVERY_HOURS,
  LOWER_BODY_PATTERNS,
  PROGRESSION_DECREASE_FACTOR,
  PROGRESSION_HARD_RPE_MARGIN,
  PROGRESSION_HARD_SETS,
  PROGRESSION_INCREMENT_KG,
  WEIGHT_ROUNDING_KG,
  FAILURE_RPE,
  MAX_SESSIONS_PER_WEEK,
  MAX_SPORT_HIGH_LOAD_AREAS,
  MIN_BIRTH_YEAR,
  MIN_METS,
  MIN_PLAY_MINUTES,
  MIN_SESSIONS_PER_WEEK,
  MIN_SPORT_SOURCES,
  MONTHS_IN_YEAR,
  MAX_SPORT_REQUESTS_PER_USER,
  OTHER_SPORT_NAME_MAX_LENGTH,
  SPORT_NORMALIZED_NAME_MAX_LENGTH,
  REFERRAL_QUESTIONS,
  SCREENING_INSTRUMENT,
  SCREENING_INSTRUMENT_VERSION,
  SCREENING_QUESTIONS,
  SESSION_LENGTHS_MINUTES,
  MIN_PORTION_GRAMS,
  MINUTES_IN_HOUR,
  PORTION_ROUND_GRAMS,
  SMALL_PORTION_BELOW_GRAMS,
  TEMPLATE_SCALE_MAX,
  TEMPLATE_SCALE_MIN,
} from './config.ts';
export { AdaptationChangeKind } from './enums/adaptation-change-kind.ts';
export { AdaptationRule } from './enums/adaptation-rule.ts';
export { AdaptationStatus } from './enums/adaptation-status.ts';
export { Allergen } from './enums/allergen.ts';
export { BodyDirection } from './enums/body-direction.ts';
export { CookingEffort } from './enums/cooking-effort.ts';
export { DayType } from './enums/day-type.ts';
export { EatingPattern } from './enums/eating-pattern.ts';
export { EnergySex } from './enums/energy-sex.ts';
export { EverydayActivity } from './enums/everyday-activity.ts';
export { MealSlot } from './enums/meal-slot.ts';
export { MealLogStatus } from './enums/meal-log-status.ts';
export { Origin } from './enums/origin.ts';
export { TrainingKind } from './enums/training-kind.ts';
export { WaterAmount } from './enums/water-amount.ts';
export { BodyArea } from './enums/body-area.ts';
export { BodyHalf } from './enums/body-half.ts';
export { ConsentPurpose } from './enums/consent-purpose.ts';
export { Emphasis } from './enums/emphasis.ts';
export { Equipment } from './enums/equipment.ts';
export { ExerciseLicence } from './enums/exercise-licence.ts';
export { ExerciseLocation } from './enums/exercise-location.ts';
export { ExerciseSource } from './enums/exercise-source.ts';
export { ImageLicence } from './enums/image-licence.ts';
export { MovementPattern } from './enums/movement-pattern.ts';
export { SessionFocus } from './enums/session-focus.ts';
export { SessionSlot } from './enums/session-slot.ts';
export { SessionStatus } from './enums/session-status.ts';
export { Eligibility } from './enums/eligibility.ts';
export { Goal } from './enums/goal.ts';
export { Intensity } from './enums/intensity.ts';
export { ActivitySource } from './enums/activity-source.ts';
export { StopAction } from './enums/stop-action.ts';
export { StopFlag } from './enums/stop-flag.ts';
export { LaunchSport } from './enums/launch-sport.ts';
export { LoadGuidance } from './enums/load-guidance.ts';
export { Need } from './enums/need.ts';
export { PickProblem } from './enums/pick-problem.ts';
export { ProgressionOutcome } from './enums/progression-outcome.ts';
export { PrescriptionUnit } from './enums/prescription-unit.ts';
export { ReferralKind } from './enums/referral-kind.ts';
export { SeasonKind } from './enums/season-kind.ts';
export { ScreeningQuestion } from './enums/screening-question.ts';
export { ScreeningStatus } from './enums/screening-status.ts';
export { SportMovement } from './enums/sport-movement.ts';
export { SportStatus } from './enums/sport-status.ts';
export { StartingLevel } from './enums/starting-level.ts';
export { TrainingMode } from './enums/training-mode.ts';
export { TrainingWeekProblem } from './enums/training-week-problem.ts';
export { Units } from './enums/units.ts';
export { Weekday } from './enums/weekday.ts';
export { VerdictKind } from './enums/verdict-kind.ts';
export type {
  Ingredient,
  IngredientUnit,
  LocalisedName,
  NameLocale,
  NutrientsPer100g,
  PortionDescription,
  UnitName,
  DayTargets,
  DayTargetsInput,
  MealSlotTime,
  MealIdea,
  MealIdeasInput,
  MealTemplate,
  PickTemplateInput,
  SlotTargets,
  SlotTargetsDay,
  TemplateEligibilityInput,
  TemplateIngredient,
  RateCheckResult,
  RestingEnergyInput,
  TrainingBlock,
  WeeklyWeight,
  EligibilityInput,
  ExerciseFilter,
  ExerciseTags,
  GenerateWeekInput,
  GeneratedWeek,
  PlayPattern,
  ScreeningInput,
  ScreeningOutcome,
  SportDemands,
  TrainingModeInput,
  TrainingWeek,
  LoggedEffort,
  PickedExercise,
  Progression,
  ProgressLoadInput,
  PickExercisesInput,
  PickSpec,
  PickValidation,
  SlotSpec,
  LoadEntry,
  StopFlagEffect,
  StopState,
  StoredStopFlag,
  LoadSummary,
  PlannedActivity,
  PlannedActivityInput,
  WeeklyLoad,
  WeekVerdictInput,
  ProgressActivity,
  ProgressSession,
  ProgressSummary,
  ProgressWeekLoad,
  ActivityFact,
  GenerationBasis,
  AdaptationChange,
  AdaptationContext,
  AdaptationHistoryEntry,
  AdaptationProposal,
  AdaptationReasonParams,
  AdaptationSession,
  AppliedAdaptation,
  CheckinFact,
  FinishedSessionFact,
  GeneratedExercise,
  GeneratedSession,
  PlannableExercise,
  RevisedSession,
  SessionRevisionRef,
} from './types.ts';
export { addDays } from './utils/add-days.ts';
export { isBasisCurrent } from './utils/is-basis-current.ts';
export { bodyHalfOf } from './utils/body-half-of.ts';
export { progressLoad } from './utils/progress-load.ts';
export { sessionLoad } from './utils/session-load.ts';
export { checkEligibility } from './utils/check-eligibility.ts';
export { evaluateScreening } from './utils/evaluate-screening.ts';
export { isGoalAvailable } from './utils/is-goal-available.ts';
export { isHotDefaultSport } from './utils/is-hot-default-sport.ts';
export { normalizeSportName } from './utils/normalize-sport-name.ts';
export { normalizeInviteCode } from './utils/normalize-invite-code.ts';
export { selectExercises } from './utils/select-exercises.ts';
export { resolveTrainingMode } from './utils/resolve-training-mode.ts';
export { validateTrainingWeek } from './utils/validate-training-week.ts';
export { generateWeek } from './utils/generate-week.ts';
export { proposeAdaptations } from './utils/propose-adaptations.ts';
export { applyAdaptation } from './utils/apply-adaptation.ts';
export { reviseAvoidingAreas } from './utils/revise-avoiding-areas.ts';
export { hardActivityDates } from './utils/hard-activity-dates.ts';
export { activityLoad } from './utils/activity-load.ts';
export { activityRpe } from './utils/activity-rpe.ts';
export { daysBetween } from './utils/days-between.ts';
export { isWeighInDateInRange } from './utils/is-weigh-in-date-in-range.ts';
export { plannedActivities } from './utils/planned-activities.ts';
export { plannedSessionLoad } from './utils/planned-session-load.ts';
export { summariseProgress } from './utils/summarise-progress.ts';
export { summariseWeeklyLoad } from './utils/summarise-weekly-load.ts';
export { weekStartOf } from './utils/week-start-of.ts';
export { weekVerdict } from './utils/week-verdict.ts';
export { isTrainingBlocked } from './utils/is-training-blocked.ts';
export { mergeExcludedAreas } from './utils/merge-excluded-areas.ts';
export { resolveStopState } from './utils/resolve-stop-state.ts';
export { stopFlagEffect } from './utils/stop-flag-effect.ts';
export { weekdayOf } from './utils/weekday-of.ts';
export { buildPickSpec } from './utils/build-pick-spec.ts';
export { validatePicks } from './utils/validate-picks.ts';
export { dayTargets } from './utils/day-targets.ts';
export { mealSlots } from './utils/meal-slots.ts';
export { rateCheck } from './utils/rate-check.ts';
export { restingEnergy } from './utils/resting-energy.ts';
export { toWeeklyWeights } from './utils/to-weekly-weights.ts';
export { INGREDIENTS } from './data/ingredients.ts';
export { describePortion } from './utils/describe-portion.ts';
export { getIngredient } from './utils/get-ingredient.ts';
export { ingredientName } from './utils/ingredient-name.ts';
export { originsAllowedBy } from './utils/origins-allowed-by.ts';
export { TEMPLATES } from './data/templates.ts';
export { eligibleTemplates } from './utils/eligible-templates.ts';
export { getTemplate } from './utils/get-template.ts';
export { matchesDislike } from './utils/matches-dislike.ts';
export { pickTemplate } from './utils/pick-template.ts';
export { scaleTemplate } from './utils/scale-template.ts';
export { slotTargets } from './utils/slot-targets.ts';
export { templateAllergens } from './utils/template-allergens.ts';
export { templateOrigins } from './utils/template-origins.ts';
export { mealIdeas } from './utils/meal-ideas.ts';
