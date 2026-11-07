import {
  ApiError,
  HttpStatus,
  NutritionStatus,
  SaveNutritionSetupRejection,
  SaveNutritionSetupStatus,
  type ExportedMealLog,
  type ExportedWaterLog,
  type ExportedWeighIn,
  type LoggedActivity,
  type LogMeal,
  type LogMealResult,
  type LogWater,
  type LogWaterResult,
  type NutritionSetup,
  type NutritionState,
  type SavedProfile,
  type SaveNutritionSetupResult,
} from '@stamina/contracts';
import {
  FALLBACK_METS_PER_INTENSITY,
  Goal,
  Intensity,
  MAX_ACTIVITY_FUTURE_DAYS,
  RECALCULATE_AT_KG_CHANGE,
  SESSION_MET,
  TrainingKind,
  daysBetween,
  dayTargets,
  mealIdeas,
  mealSlots,
  plannedActivities,
  rateCheck,
  toWeeklyWeights,
  weekStartOf,
  type MealLogStatus,
  type TrainingBlock,
} from '@stamina/domain';

/** What the fake API needs, per call, to apply the server's rules (the caller knows the user, the clock, the Program and the other fakes). */
export interface FakeNutritionContext {
  userId: string;
  /** Today, `YYYY-MM-DD` in UTC. */
  today: string;
  /** The week anchor: the first Block's start, else today. */
  anchor: string;
  profile: SavedProfile | undefined;
  /** The latest Screening turned Nutrition off. */
  nutritionOff: boolean;
  /** The user's current Sessions, by the day each is planned for. */
  sessions: readonly { date: string; minutes: number }[];
  activities: readonly LoggedActivity[];
  /** Every weigh-in, in the order they were entered. */
  weighIns: readonly ExportedWeighIn[];
}

/**
 * What the fake API remembers of Meals, with the server's rules and the real domain functions
 * (`dayTargets`, `rateCheck`, `mealSlots`): `Off` while Nutrition is off, `Locked` until the
 * setup is saved, otherwise the day's targets from the basis weight and the day's training (each
 * Session, each Activity logged that day, and the planned play day while none is logged; the fake
 * has no Sport Profiles, so Activities use the fallback METs). A body direction counts only
 * while the Goal is body composition. Water and meal logs are idempotent by id (a replay returns
 * the stored row, another person's id is a `409`); both are refused with an `ApiError` 422 while
 * Nutrition is off, and a day more than `MAX_ACTIVITY_FUTURE_DAYS` ahead is an `ApiError` 400.
 * Meals carry the idea the real `mealIdeas` rule builds from the setup and the day's targets, and
 * the latest status logged per slot. Saving the setup is the caller's to pair with a weigh-in of
 * that weight (only when the weight is new).
 */
export function createFakeNutrition() {
  const setups = new Map<string, NutritionSetup>();
  const waterLogs = new Map<string, ExportedWaterLog[]>();
  const readWater = (userId: string) => waterLogs.get(userId) ?? [];
  const mealLogs = new Map<string, ExportedMealLog[]>();
  const readMeals = (userId: string) => mealLogs.get(userId) ?? [];

  const assertDayInRange = (today: string, date: string) => {
    if (daysBetween(today, date) > MAX_ACTIVITY_FUTURE_DAYS) {
      throw new ApiError(HttpStatus.BadRequest);
    }
  };

  const trainingBlocks = (context: FakeNutritionContext, date: string): TrainingBlock[] => {
    const { profile, anchor } = context;
    const blocks: TrainingBlock[] = context.sessions
      .filter((session) => session.date === date)
      .map(({ minutes }) => ({
        kind: TrainingKind.Session,
        minutes,
        mets: SESSION_MET,
        hot: false,
        hard: false,
      }));
    const logged = context.activities.filter((activity) => activity.date === date);
    for (const activity of logged) {
      blocks.push({
        kind: TrainingKind.Activity,
        minutes: activity.minutes,
        mets: FALLBACK_METS_PER_INTENSITY[activity.intensity],
        hot: activity.hot,
        hard: activity.intensity === Intensity.Hard,
      });
    }
    const planned =
      profile &&
      plannedActivities(weekStartOf(anchor, date), profile, anchor).find(
        (day) => day.date === date,
      );
    if (profile && planned && !logged.some((activity) => activity.planned)) {
      blocks.push({
        kind: TrainingKind.Activity,
        minutes: planned.minutes,
        mets: FALLBACK_METS_PER_INTENSITY[planned.intensity],
        hot: profile.hotConditionsDefault,
        hard: planned.intensity === Intensity.Hard,
      });
    }
    return blocks;
  };

  return {
    /** The setup as saved (basis weight included), for the data export. */
    setup: (userId: string): NutritionSetup | null => setups.get(userId) ?? null,
    /** Every water log of the user, oldest first (the data export). */
    allWater: readWater,
    /** Every meal log of the user, oldest first (the data export). */
    allMeals: readMeals,
    /** Account deletion. */
    forget(userId: string): void {
      setups.delete(userId);
      waterLogs.delete(userId);
      mealLogs.delete(userId);
    },
    read(context: FakeNutritionContext, date: string): NutritionState {
      assertDayInRange(context.today, date);
      const { userId, profile } = context;
      const saved = setups.get(userId);
      if (context.nutritionOff) return { status: NutritionStatus.Off };
      if (!profile || !saved) return { status: NutritionStatus.Locked };

      const setup: NutritionSetup = {
        ...saved,
        bodyDirection: profile.goal === Goal.BodyComposition ? saved.bodyDirection : null,
      };
      const ordered = [...context.weighIns].sort(
        (a, b) => a.date.localeCompare(b.date) || a.loggedAt.localeCompare(b.loggedAt),
      );
      const check = rateCheck(toWeeklyWeights(context.anchor, ordered));
      const targets = dayTargets({
        sex: setup.sex,
        ageYears: Number(context.today.slice(0, 4)) - profile.birthYear,
        heightCm: setup.heightCm,
        weightKg: setup.weightKg,
        everydayActivity: setup.everydayActivity,
        bodyDirection: setup.bodyDirection,
        trainings: trainingBlocks(context, date),
        deficitHalved: check.deficitHalved,
      });
      const ideas = mealIdeas({
        date,
        pattern: setup.eatingPattern,
        allergens: setup.allergens,
        dislikes: setup.dislikes,
        effort: setup.cookingEffort,
        mealsPerDay: setup.mealsPerDay,
        targets,
      });
      // The latest log of a slot wins: logs are in the order they were made.
      const statuses = new Map<number, MealLogStatus>();
      for (const log of readMeals(userId)) {
        if (log.date === date) statuses.set(log.slotIndex, log.status);
      }
      return {
        status: NutritionStatus.Ready,
        date,
        setup,
        targets,
        water: {
          ml: readWater(userId)
            .filter((log) => log.date === date)
            .reduce((total, { ml }) => total + ml, 0),
          targetMl: targets.drinksMl,
        },
        meals: mealSlots(setup.mealsPerDay).map((meal, index) => ({
          ...meal,
          idea: ideas[index] ?? null,
          status: statuses.get(index) ?? null,
        })),
        rateCheck: { deficitHalved: targets.deficitHalved, prompt: check.prompt },
      };
    },
    /** Stores the setup and answers `null`, or answers why not; no profile is an `ApiError` 404. */
    save(
      context: FakeNutritionContext,
      setup: NutritionSetup,
    ): Extract<SaveNutritionSetupResult, { status: SaveNutritionSetupStatus.Rejected }> | null {
      const { profile, userId } = context;
      if (!profile) throw new ApiError(HttpStatus.NotFound);
      const rejection = context.nutritionOff
        ? SaveNutritionSetupRejection.NutritionOff
        : setup.bodyDirection !== null && profile.goal !== Goal.BodyComposition
          ? SaveNutritionSetupRejection.BodyDirectionNotAllowed
          : undefined;
      if (rejection) return { status: SaveNutritionSetupStatus.Rejected, reason: rejection };
      setups.set(userId, setup);
      return null;
    },
    /**
     * After a weigh-in of `weightKg` dated `date`: the basis weight follows it when it is the
     * current weight (no later day) and `RECALCULATE_AT_KG_CHANGE` or more away from the basis.
     */
    rebase(userId: string, weightKg: number, date: string, others: readonly ExportedWeighIn[]) {
      const saved = setups.get(userId);
      if (!saved || others.some((other) => other.date > date)) return;
      const change = Math.round(Math.abs(weightKg - saved.weightKg) * 1000) / 1000;
      if (change >= RECALCULATE_AT_KG_CHANGE) setups.set(userId, { ...saved, weightKg });
    },
    logWater(context: FakeNutritionContext, entry: LogWater): LogWaterResult {
      const { userId, today } = context;
      if (context.nutritionOff) throw new ApiError(HttpStatus.UnprocessableEntity);
      for (const [owner, logs] of waterLogs) {
        const replay = logs.find(({ id }) => id === entry.id);
        if (replay === undefined) continue;
        if (owner !== userId) throw new ApiError(HttpStatus.Conflict);
        return { id: replay.id, date: replay.date, ml: replay.ml };
      }
      const date = entry.date ?? today;
      assertDayInRange(today, date);
      const stored: ExportedWaterLog = {
        id: entry.id,
        date,
        ml: entry.ml,
        loggedAt: new Date().toISOString(),
      };
      waterLogs.set(userId, [...readWater(userId), stored]);
      return { id: stored.id, date, ml: stored.ml };
    },
    logMeal(context: FakeNutritionContext, entry: LogMeal): LogMealResult {
      const { userId, today } = context;
      if (context.nutritionOff) throw new ApiError(HttpStatus.UnprocessableEntity);
      for (const [owner, logs] of mealLogs) {
        const replay = logs.find(({ id }) => id === entry.id);
        if (replay === undefined) continue;
        if (owner !== userId) throw new ApiError(HttpStatus.Conflict);
        return {
          id: replay.id,
          date: replay.date,
          slotIndex: replay.slotIndex,
          status: replay.status,
        };
      }
      const date = entry.date ?? today;
      assertDayInRange(today, date);
      const stored: ExportedMealLog = {
        id: entry.id,
        date,
        slotIndex: entry.slotIndex,
        status: entry.status,
        templateId: entry.templateId ?? null,
        loggedAt: new Date().toISOString(),
      };
      mealLogs.set(userId, [...readMeals(userId), stored]);
      return { id: stored.id, date, slotIndex: stored.slotIndex, status: stored.status };
    },
  };
}
