import {
  ApiPath,
  HttpMethod,
  NutritionStatus,
  SaveNutritionSetupRejection,
  SaveNutritionSetupStatus,
  SportKind,
  userExportSchema,
  type ProfileSubmission,
} from '@stamina/contracts';
import {
  BodyDirection,
  DayType,
  EnergySex,
  EverydayActivity,
  Goal,
  Intensity,
  LaunchSport,
  MAX_BODY_WEIGHT_KG,
  MIN_BODY_WEIGHT_KG,
  MealSlot,
  ScreeningQuestion,
  WaterAmount,
  Allergen,
  CookingEffort,
} from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { profile, waterLog, weighIn } from '../src/db/schema.ts';
import type { UserTx } from '../src/db/types.ts';
import { withUser } from '../src/db/with-user.ts';
import { ApiErrorCode } from '../src/enums/api-error-code.ts';
import { EXERCISE_DATA_DIR } from '../src/exercises/node.ts';
import { activityOf, postActivity } from './support/activity-fixtures.ts';
import {
  getNutrition,
  getReady,
  postWater,
  putSetup,
  setupOf,
  waterOf,
} from './support/nutrition-fixtures.ts';
import {
  PROGRAM_NOW,
  approveSport,
  padelPersona,
  programUser,
  type ProgramUserOptions,
} from './support/program-fixtures.ts';
import { insertWeighIn, postWeighIn } from './support/progress-fixtures.ts';
import {
  PG_INSUFFICIENT_PRIVILEGE,
  screeningSubmission,
  type FixtureUser,
  type TestApi,
} from './support/safety-fixtures.ts';
import { createScratchDatabase, type ScratchDatabase } from './support/scratch-database.ts';
import { sessionsOf } from './support/session-fixtures.ts';
import { startTestApi } from './support/test-api.ts';

/**
 * The first Program week runs Fri 2026-11-06 to Thu 2026-11-12 (weeks are counted from its start).
 * Days before it have no Session and no planned Activity, so each test picks the kind of day it
 * wants by what it logs there.
 */
const TODAY = '2026-11-12';
const THURSDAY_NOON = new Date(`${TODAY}T12:00:00.000Z`);
const OCTOBER_20_NOON = new Date('2026-10-20T12:00:00.000Z');
const PLAY_DAYS = ['2026-11-06', '2026-11-10'];
const REST_DAY = '2026-11-02';
const BORN = 1996; // 30 in 2026, the year of every clock below

/**
 * The man of `setupOf` (80 kg, 180 cm, 30, on his feet): resting energy is 10x80 + 6.25x180 - 5x30
 * + 5 = 1780, times 1.5 = 2670 kcal before training. Padel is approved with METs 4 / 6 / 8, so a
 * Session (5) adds (5-1)x80 kcal an hour, a moderate Activity (6-1)x80, a hard one (8-1)x80.
 */
const RESTING = 1780;
const BASELINE = 2670;

describe('Nutrition targets and water', () => {
  let api: TestApi;
  let scratch: ScratchDatabase;
  let clock = PROGRAM_NOW;

  beforeAll(async () => {
    scratch = await createScratchDatabase(EXERCISE_DATA_DIR);
    api = await startTestApi({ databaseUrl: scratch.url, now: () => clock });
    await approveSport(api, LaunchSport.Padel, (sportProfile) => ({
      ...sportProfile,
      metsPerIntensity: { easy: 4, moderate: 6, hard: 8 },
    }));
  });
  afterAll(async () => {
    await api.close();
    await scratch.drop();
  });

  /** A fresh padel player (Tue and Fri, hard, 90 minutes) with a Program made on `PROGRAM_NOW`; then it is the Thursday that ends the first week. */
  const player = async (
    submission: Partial<ProfileSubmission> = {},
    options: Omit<ProgramUserOptions, 'submission'> = {},
  ) => {
    clock = PROGRAM_NOW;
    const user = await programUser(api, {
      submission: { ...padelPersona(), birthYear: BORN, ...submission },
      ...options,
    });
    const { week } = await sessionsOf(user);
    clock = THURSDAY_NOON;
    return { user, week };
  };

  /** A player whose Goal is body composition, set up with `direction` (null is maintenance). */
  const bodyPlayer = async (
    direction: BodyDirection | null,
    setup: Parameters<typeof setupOf>[0] = {},
  ) => {
    const made = await player({ goal: Goal.BodyComposition });
    await putSetup(made.user, setupOf({ ...setup, bodyDirection: direction }));
    return made;
  };

  /** A player with the setup saved. */
  const setUp = async (setup: Parameters<typeof setupOf>[0] = {}) => {
    const made = await player();
    const saved = await putSetup(made.user, setupOf(setup));
    expect(saved.status).toBe(200);
    return made;
  };

  const log = (user: FixtureUser, date: string, overrides: Parameters<typeof activityOf>[1] = {}) =>
    postActivity(user, activityOf(date, overrides));

  /** Saves the user's profile again (an existing profile needs no invite) with some answers changed. */
  const resubmit = async (user: FixtureUser, changes: Partial<ProfileSubmission>) => {
    const [row] = await api.db.select().from(profile).where(eq(profile.userId, user.userId));
    const response = await user.call(HttpMethod.Post, ApiPath.Profile, {
      needs: row!.needs,
      birthYear: row!.birthYear,
      country: row!.country,
      sport: { kind: SportKind.Launch, sport: row!.launchSport! },
      playDays: row!.playDays,
      playVaries: row!.playVaries,
      playMinutes: row!.playMinutes,
      playIntensity: row!.playIntensity,
      goal: row!.goal,
      trainingWeek: {
        sessionsPerWeek: row!.sessionsPerWeek!,
        sessionMinutes: row!.sessionMinutes!,
        availableDays: row!.availableDays!,
      },
      locale: row!.locale,
      units: row!.units,
      inviteCode: 'UNUSED-EXISTING-PROFILE',
      ...changes,
    });
    expect(response.status).toBe(200);
  };

  describe('Unlock Meals', () => {
    it('is locked until the setup is saved', async () => {
      const { user } = await player();

      expect(await getNutrition(user, REST_DAY)).toEqual({ status: NutritionStatus.Locked });
    });

    it('is locked for someone with no profile yet, and cannot save a setup', async () => {
      const user = await programUser(api, { skip: 'profile' });

      expect(await getNutrition(user, REST_DAY)).toEqual({ status: NutritionStatus.Locked });
      expect((await putSetup(user, setupOf())).status).toBe(404);
    });

    it('saves the setup, shows Meals for today with its basis weight, and starts the weight history', async () => {
      const { user } = await player();
      const setup = setupOf({
        allergens: [Allergen.Peanuts, Allergen.Milk],
        dislikes: ['  anchovies ', 'olives'],
        cookingEffort: CookingEffort.Quick,
      });

      const saved = await putSetup(user, setup);

      expect(saved.status).toBe(200);
      expect(saved.result).toMatchObject({
        status: SaveNutritionSetupStatus.Saved,
        nutrition: {
          status: NutritionStatus.Ready,
          date: TODAY,
          setup: { ...setup, dislikes: ['anchovies', 'olives'] },
        },
      });
      expect(await getReady(user, REST_DAY)).toMatchObject({
        setup: { allergens: [Allergen.Peanuts, Allergen.Milk], weightKg: 80 },
      });
      const history = await api.db.select().from(weighIn).where(eq(weighIn.userId, user.userId));
      expect(history).toMatchObject([{ weightKg: 80, date: TODAY }]);
    });

    it('adds a weigh-in on an edit only when the weight differs from the basis weight, so an edit cannot replace a real weigh-in', async () => {
      const { user } = await setUp();
      await postWeighIn(user, { weightKg: 80.5 }); // a real weigh-in today, within 2 kg of the basis

      const weightsOf = async () =>
        (await api.db.select().from(weighIn).where(eq(weighIn.userId, user.userId)))
          .map(({ weightKg }) => weightKg)
          .sort((a, b) => a - b);

      await putSetup(user, setupOf({ mealsPerDay: 4 }));

      expect(await weightsOf()).toEqual([80, 80.5]);

      await putSetup(user, setupOf({ weightKg: 78, mealsPerDay: 4 }));

      expect(await weightsOf()).toEqual([78, 80, 80.5]);
    });

    it('lets the person edit the setup, which changes the targets and the meal slots', async () => {
      const { user } = await setUp();

      await putSetup(user, setupOf({ weightKg: 70, mealsPerDay: 5, sex: EnergySex.Female }));

      const ready = await getReady(user, REST_DAY);
      expect(ready.setup).toMatchObject({ weightKg: 70, mealsPerDay: 5, sex: EnergySex.Female });
      // 10x70 + 6.25x180 - 5x30 - 161 = 1514
      expect(ready.targets.restingKcal).toBe(1514);
      expect(ready.meals).toHaveLength(5);
    });

    it('lists the meal slots for 3, 4 and 5 meals a day, in time order', async () => {
      const { user } = await setUp();
      const slotsFor = async (mealsPerDay: number) => {
        await putSetup(user, setupOf({ mealsPerDay }));
        return (await getReady(user, REST_DAY)).meals.map(({ slot, at }) => ({ slot, at }));
      };
      const at = (hours: number, minutes = 0) => hours * 60 + minutes;

      expect(await slotsFor(3)).toEqual([
        { slot: MealSlot.Breakfast, at: at(8) },
        { slot: MealSlot.Lunch, at: at(13) },
        { slot: MealSlot.Dinner, at: at(19, 30) },
      ]);
      expect(await slotsFor(4)).toEqual([
        { slot: MealSlot.Breakfast, at: at(8) },
        { slot: MealSlot.Lunch, at: at(13) },
        { slot: MealSlot.Snack, at: at(16, 30) },
        { slot: MealSlot.Dinner, at: at(19, 30) },
      ]);
      expect(await slotsFor(5)).toEqual([
        { slot: MealSlot.Breakfast, at: at(8) },
        { slot: MealSlot.Snack, at: at(10, 30) },
        { slot: MealSlot.Lunch, at: at(13) },
        { slot: MealSlot.Snack, at: at(16, 30) },
        { slot: MealSlot.Dinner, at: at(19, 30) },
      ]);
    });

    it('turns away a body direction unless the Goal is body composition, storing nothing', async () => {
      const { user } = await player();

      const saved = await putSetup(user, setupOf({ bodyDirection: BodyDirection.LoseFat }));

      expect(saved.status).toBe(422);
      expect(saved.result).toEqual({
        status: SaveNutritionSetupStatus.Rejected,
        reason: SaveNutritionSetupRejection.BodyDirectionNotAllowed,
      });
      expect(await getNutrition(user, REST_DAY)).toEqual({ status: NutritionStatus.Locked });
      expect(await api.db.select().from(weighIn).where(eq(weighIn.userId, user.userId))).toEqual(
        [],
      );
    });

    it('accepts a body direction, or none (maintenance), for a body-composition Goal', async () => {
      const { user } = await player({ goal: Goal.BodyComposition });

      expect(
        (await putSetup(user, setupOf({ bodyDirection: BodyDirection.GainMuscle }))).status,
      ).toBe(200);
      expect((await getReady(user, REST_DAY)).setup.bodyDirection).toBe(BodyDirection.GainMuscle);
      expect((await putSetup(user, setupOf({ bodyDirection: null }))).status).toBe(200);
      expect((await getReady(user, REST_DAY)).setup.bodyDirection).toBeNull();
    });

    it('stops applying a saved body direction once the Goal is no longer body composition', async () => {
      const { user } = await bodyPlayer(BodyDirection.GainMuscle);
      expect((await getReady(user, REST_DAY)).targets.energyKcal).toBe(BASELINE + 250);

      await resubmit(user, { goal: Goal.GeneralFitness });

      const ready = await getReady(user, REST_DAY);
      expect(ready.setup.bodyDirection).toBeNull();
      expect(ready.targets.energyKcal).toBe(BASELINE);
    });
  });

  describe('targets by day type', () => {
    it('rest day: baseline energy, 3 g/kg carbs, 1.6 g/kg protein, fat filling up to 35 %, base drinks', async () => {
      const { user } = await setUp();

      const { targets, water } = await getReady(user, REST_DAY);

      expect(targets).toEqual({
        dayType: DayType.Rest,
        restingKcal: RESTING,
        energyKcal: BASELINE,
        deficitKcal: 0,
        gainKcal: 0,
        floorApplied: false,
        deficitHalved: false,
        proteinG: 128, // 1.6 x 80
        carbsG: 240, // 3 x 80
        // 2670 - 512 (protein) - 960 (carbs) = 1198 kcal left, held to 35 % of 2670 = 934.5 kcal
        fatG: 104,
        drinksMl: 2000,
        drinkCapApplied: false,
        drinkToThirst: false,
        preActivityMl: null,
        electrolyteNote: false,
        duringCarbsGPerHour: null,
      });
      expect(water).toEqual({ ml: 0, targetMl: 2000 });
    });

    it('Session day: adds (5 - 1) x kg x hours, 4 g/kg carbs, +500 ml an hour, drink to thirst', async () => {
      const { user, week } = await setUp();
      const day = week.sessions.find(({ date }) => !PLAY_DAYS.includes(date))!;
      expect(day.minutes).toBe(45);

      const { targets } = await getReady(user, day.date);

      expect(targets).toMatchObject({
        dayType: DayType.Session,
        energyKcal: BASELINE + 240, // 4 x 80 x 0.75 h
        carbsG: 320,
        proteinG: 128,
        fatG: 113, // 1118 kcal left, held to 35 % of 2910 = 1018.5 kcal
        drinksMl: 2375, // 2000 + 500 x 0.75
        drinkToThirst: true,
        preActivityMl: null,
        electrolyteNote: false,
        duringCarbsGPerHour: null,
      });
    });

    it('Activity day: the sport METs at the logged intensity, 5 g/kg carbs, a pre-Activity drink', async () => {
      const { user } = await setUp();
      await log(user, '2026-11-03', { minutes: 60, intensity: Intensity.Moderate });

      const { targets } = await getReady(user, '2026-11-03');

      expect(targets).toMatchObject({
        dayType: DayType.Activity,
        energyKcal: BASELINE + 400, // (6 - 1) x 80 x 1 h
        carbsG: 400,
        fatG: 106,
        drinksMl: 2500,
        drinkToThirst: true,
        preActivityMl: { min: 400, max: 800 }, // 5 and 10 ml/kg
        electrolyteNote: false,
        duringCarbsGPerHour: null,
      });
    });

    it('hard Activity day: 6.5 g/kg carbs; a long hot one adds the electrolyte note and carbs during', async () => {
      const { user } = await setUp();
      await log(user, '2026-11-04', { minutes: 150, intensity: Intensity.Hard, hot: true });

      const { targets } = await getReady(user, '2026-11-04');

      expect(targets).toMatchObject({
        dayType: DayType.HardActivity,
        energyKcal: BASELINE + 1400, // (8 - 1) x 80 x 2.5 h
        carbsG: 520,
        fatG: 158, // held to 35 % of 4070 = 1424.5 kcal
        drinksMl: 3875, // 2000 + 2.5 h x (500 + 250)
        drinkCapApplied: false,
        preActivityMl: { min: 400, max: 800 },
        electrolyteNote: true,
        duringCarbsGPerHour: { min: 30, max: 60 },
      });
    });

    it('adds carbs during only above 90 minutes, and the electrolyte note only above 2 h or when hot', async () => {
      const { user } = await setUp();
      await log(user, '2026-10-29', { minutes: 90, intensity: Intensity.Easy });
      await log(user, '2026-10-30', { minutes: 91, intensity: Intensity.Easy });
      await log(user, '2026-10-31', { minutes: 120, intensity: Intensity.Easy });
      await log(user, '2026-11-01', { minutes: 121, intensity: Intensity.Easy });
      await log(user, '2026-11-02', { minutes: 60, intensity: Intensity.Easy, hot: true });

      const day = async (date: string) => (await getReady(user, date)).targets;

      expect(await day('2026-10-29')).toMatchObject({
        duringCarbsGPerHour: null,
        electrolyteNote: false,
      });
      expect(await day('2026-10-30')).toMatchObject({
        duringCarbsGPerHour: { min: 30, max: 60 },
        electrolyteNote: false,
      });
      expect(await day('2026-10-31')).toMatchObject({
        duringCarbsGPerHour: { min: 30, max: 60 },
        electrolyteNote: false,
      });
      expect(await day('2026-11-01')).toMatchObject({ electrolyteNote: true });
      expect(await day('2026-11-02')).toMatchObject({
        electrolyteNote: true,
        duringCarbsGPerHour: null,
        drinksMl: 2000 + 750, // 60 minutes at 500 + 250 ml an hour
      });
    });

    it('adds drinks for every block of the day, within 1 L an hour of training', async () => {
      const { user, week } = await setUp();
      const day = week.sessions.find(({ date }) => !PLAY_DAYS.includes(date))!;
      await log(user, day.date, { minutes: 120, intensity: Intensity.Hard, hot: true });

      const { targets } = await getReady(user, day.date);

      const hours = 0.75 + 2;
      expect(targets.drinksMl - 2000).toBeLessThanOrEqual(hours * 1000);
      expect(targets.drinksMl).toBe(2000 + 0.75 * 500 + 2 * 750);
      expect(targets.dayType).toBe(DayType.HardActivity);
    });

    it('counts an unlogged planned play day from the profile (hard, 90 minutes) until it is logged', async () => {
      const { user, week } = await setUp();
      const playDay = PLAY_DAYS.find((date) => !week.sessions.some((s) => s.date === date))!;
      expect(playDay).toBeDefined();

      const planned = (await getReady(user, playDay)).targets;
      expect(planned).toMatchObject({
        dayType: DayType.HardActivity,
        energyKcal: BASELINE + 840, // (8 - 1) x 80 x 1.5 h
        carbsG: 520,
        drinksMl: 2750,
        electrolyteNote: false,
        duringCarbsGPerHour: null, // 90 minutes is not more than 90
      });

      await log(user, playDay, { minutes: 45, intensity: Intensity.Moderate });
      const logged = (await getReady(user, playDay)).targets;
      expect(logged).toMatchObject({
        dayType: DayType.Activity,
        energyKcal: BASELINE + 300, // (6 - 1) x 80 x 0.75 h; the plan is replaced, not added
      });
    });

    it('sums a Session and an Activity on one day, and takes the Activity day type', async () => {
      const { user, week } = await setUp();
      const day = week.sessions.find(({ date }) => !PLAY_DAYS.includes(date))!;
      await log(user, day.date, { minutes: 60, intensity: Intensity.Moderate });

      const { targets } = await getReady(user, day.date);

      expect(targets).toMatchObject({
        dayType: DayType.Activity,
        energyKcal: BASELINE + 240 + 400,
        drinksMl: 2000 + 375 + 500,
      });
    });

    it('uses the METs of the Activity’s own sport, and a fallback for a sport with no profile', async () => {
      const { user } = await player({ sport: { kind: SportKind.Other, name: 'Roller derby' } });
      await putSetup(user, setupOf());
      await log(user, '2026-11-03', { minutes: 60, intensity: Intensity.Moderate });
      await log(user, '2026-11-04', {
        minutes: 60,
        intensity: Intensity.Moderate,
        sport: { kind: SportKind.Other, name: 'Roller derby' },
      });

      const approved = (await getReady(user, '2026-11-03')).targets;
      const fallback = (await getReady(user, '2026-11-04')).targets;

      expect(approved.energyKcal).toBe(BASELINE + 400); // padel, approved: 6 METs
      expect(fallback.energyKcal).toBe(BASELINE + 320); // no Sport Profile: 5 METs
    });

    it('computes age from the birth year and the clock’s year', async () => {
      const { user } = await setUp();

      clock = new Date('2027-03-01T12:00:00.000Z');
      const older = (await getReady(user, REST_DAY)).targets;

      expect(older.restingKcal).toBe(RESTING - 5); // 31
    });

    it('unspecified sex sits midway between the two Mifflin-St Jeor constants and drinks 1.8 L', async () => {
      const { user } = await player();
      await putSetup(user, setupOf({ sex: EnergySex.Unspecified }));

      const { targets } = await getReady(user, REST_DAY);

      expect(targets.restingKcal).toBe(RESTING - 83); // constant -78 instead of +5
      expect(targets.drinksMl).toBe(1800);
    });

    it('scales the baseline with everyday activity: 1.4, 1.5 and 1.7', async () => {
      const { user } = await player();
      const energy = async (everydayActivity: EverydayActivity) => {
        await putSetup(user, setupOf({ everydayActivity }));
        return (await getReady(user, REST_DAY)).targets.energyKcal;
      };

      expect(await energy(EverydayActivity.Sitting)).toBe(Math.round(RESTING * 1.4));
      expect(await energy(EverydayActivity.OnFeet)).toBe(Math.round(RESTING * 1.5));
      expect(await energy(EverydayActivity.Physical)).toBe(Math.round(RESTING * 1.7));
    });
  });

  describe('goal adjustment', () => {
    it('fat loss: -400 kcal on a rest day with 2.0 g/kg protein', async () => {
      const { user } = await bodyPlayer(BodyDirection.LoseFat);

      const { targets } = await getReady(user, REST_DAY);

      expect(targets).toMatchObject({
        energyKcal: BASELINE - 400,
        deficitKcal: -400,
        floorApplied: false,
        deficitHalved: false,
        proteinG: 160,
        carbsG: 240,
        fatG: 74,
      });
    });

    it('fat loss: never a deficit on a hard Activity day', async () => {
      const { user } = await bodyPlayer(BodyDirection.LoseFat);
      await log(user, '2026-11-04', { minutes: 60, intensity: Intensity.Hard });
      await log(user, '2026-11-03', { minutes: 60, intensity: Intensity.Moderate });

      const hard = (await getReady(user, '2026-11-04')).targets;
      const moderate = (await getReady(user, '2026-11-03')).targets;

      expect(hard).toMatchObject({
        dayType: DayType.HardActivity,
        deficitKcal: 0,
        energyKcal: BASELINE + 560, // (8 - 1) x 80 x 1 h, no deficit
        proteinG: 160,
      });
      expect(moderate).toMatchObject({
        dayType: DayType.Activity,
        deficitKcal: -400,
        energyKcal: BASELINE + 400 - 400,
      });
    });

    it('drops carbs first when protein, carbs and 20 % fat do not fit', async () => {
      const { user } = await bodyPlayer(BodyDirection.LoseFat);
      await log(user, '2026-11-03', { minutes: 60, intensity: Intensity.Moderate });

      const { targets } = await getReady(user, '2026-11-03');

      // 2670 kcal: protein 640, fat at least 534 (20 %) leave 1496 kcal = 374 g, less than the 400 g wanted
      expect(targets).toMatchObject({ proteinG: 160, carbsG: 374, fatG: 59 });
    });

    it('muscle gain: +250 kcal', async () => {
      const { user } = await bodyPlayer(BodyDirection.GainMuscle);

      const { targets } = await getReady(user, REST_DAY);

      expect(targets).toMatchObject({
        energyKcal: BASELINE + 250,
        gainKcal: 250,
        deficitKcal: 0,
        proteinG: 128,
        fatG: 114, // held to 35 % of 2920 = 1022 kcal
      });
    });

    it('maintenance (body composition Goal, no direction): no adjustment', async () => {
      const { user } = await bodyPlayer(null);

      const { targets } = await getReady(user, REST_DAY);

      expect(targets).toMatchObject({ energyKcal: BASELINE, deficitKcal: 0, gainKcal: 0 });
    });

    it('never goes below resting energy: the floor raises the target and says so', async () => {
      // 10x35 + 6.25x130 - 5x70 - 161 = 651.5 kcal resting; x 1.4 = 912.1, less 400 is under it
      const { user } = await player({ goal: Goal.BodyComposition, birthYear: 1956 });
      await putSetup(
        user,
        setupOf({
          sex: EnergySex.Female,
          heightCm: 130,
          weightKg: 35,
          everydayActivity: EverydayActivity.Sitting,
          bodyDirection: BodyDirection.LoseFat,
        }),
      );

      const { targets } = await getReady(user, REST_DAY);

      expect(targets.restingKcal).toBe(652);
      expect(targets).toMatchObject({
        floorApplied: true,
        energyKcal: targets.restingKcal,
        proteinG: 70,
      });
      expect(targets.deficitKcal).toBeGreaterThan(-400);
      expect(targets.deficitKcal).toBeLessThan(0);
      // carbs wanted 3 x 35 = 105 g but 70 g protein and 20 % fat leave room for 60 g
      expect(targets.carbsG).toBe(60);
      expect(targets.fatG).toBe(14);
    });

    it('does not set the floor flag when the adjustment stays above resting energy', async () => {
      const { user } = await bodyPlayer(BodyDirection.LoseFat);

      expect((await getReady(user, REST_DAY)).targets.floorApplied).toBe(false);
    });
  });

  describe('rate check', () => {
    /**
     * Weeks count from the Program start (Fri 2026-11-06): 10-16, 10-23, 10-30 and 11-06 are
     * consecutive weeks. The setup is saved on 10-20 (80 kg, week 10-16); weigh-ins are inserted
     * as the table owner so they do not move the nutrition weight.
     */
    const history = async (
      direction: BodyDirection | null,
      weights: readonly (readonly [string, number])[],
    ) => {
      const made = await player({ goal: Goal.BodyComposition });
      clock = OCTOBER_20_NOON;
      await putSetup(made.user, setupOf({ bodyDirection: direction }));
      for (const [date, weightKg] of weights) await insertWeighIn(api, made.user, date, weightKg);
      clock = THURSDAY_NOON;
      return made.user;
    };

    it('does nothing after one fast week', async () => {
      const user = await history(BodyDirection.LoseFat, [['2026-10-27', 79]]);

      const ready = await getReady(user, REST_DAY);

      expect(ready.rateCheck).toEqual({ deficitHalved: false, prompt: false });
      expect(ready.targets.deficitKcal).toBe(-400);
    });

    it('halves the deficit after two weeks of more than 1 % loss, with the flag set, and prompts only after a third', async () => {
      const user = await history(BodyDirection.LoseFat, [
        ['2026-10-27', 79], // -1.25 %
        ['2026-11-03', 78], // -1.27 %
      ]);

      const twice = await getReady(user, REST_DAY);

      expect(twice.rateCheck).toEqual({ deficitHalved: true, prompt: false });
      expect(twice.targets).toMatchObject({
        deficitHalved: true,
        deficitKcal: -200,
        energyKcal: BASELINE - 200,
      });

      await insertWeighIn(api, user, '2026-11-10', 77); // -1.28 %

      const thrice = await getReady(user, REST_DAY);
      expect(thrice.rateCheck).toEqual({ deficitHalved: true, prompt: true });
      expect(thrice.targets.deficitKcal).toBe(-200);
    });

    it('shows the prompt to anyone, with no deficit to halve for a maintenance Goal', async () => {
      const user = await history(null, [
        ['2026-10-27', 79],
        ['2026-11-03', 78],
        ['2026-11-10', 77],
      ]);

      const ready = await getReady(user, REST_DAY);

      expect(ready.rateCheck).toEqual({ deficitHalved: false, prompt: true });
      expect(ready.targets).toMatchObject({ deficitKcal: 0, energyKcal: BASELINE });
    });

    it('does not fire for losses of 1 % a week or less, or for a weight that rises', async () => {
      const slow = await history(BodyDirection.LoseFat, [
        ['2026-10-27', 79.5], // -0.6 %
        ['2026-11-03', 79], // -0.6 %
        ['2026-11-10', 78.5], // -0.6 %
      ]);
      const gaining = await history(BodyDirection.LoseFat, [
        ['2026-10-27', 81],
        ['2026-11-03', 82],
        ['2026-11-10', 83],
      ]);

      expect((await getReady(slow, REST_DAY)).rateCheck).toEqual({
        deficitHalved: false,
        prompt: false,
      });
      expect((await getReady(gaining, REST_DAY)).rateCheck).toEqual({
        deficitHalved: false,
        prompt: false,
      });
    });

    it('ignores an interval of more than 14 days, which breaks the run', async () => {
      const user = await history(BodyDirection.LoseFat, [
        ['2026-11-04', 77.9], // 15 days after the 10-20 setup weigh-in, so 80 -> 77.9 is no interval
        ['2026-11-10', 77], // -1.16 % in 6 days: 1.35 % a week
      ]);

      expect((await getReady(user, REST_DAY)).rateCheck).toEqual({
        deficitHalved: false,
        prompt: false,
      });
    });

    it('does not read a Thursday-to-Friday pair, one day apart, as a week: the interval is ignored and breaks the run', async () => {
      const user = await history(BodyDirection.LoseFat, [
        ['2026-10-27', 79], // -1.25 % in 7 days
        ['2026-11-05', 77.9], // Thursday, 9 days on: -1.39 % = 1.08 % a week
      ]);
      expect((await getReady(user, REST_DAY)).rateCheck.deficitHalved).toBe(true);

      await insertWeighIn(api, user, '2026-11-06', 77); // Friday, the next program week, 1 day on: -1.2 %

      expect((await getReady(user, REST_DAY)).rateCheck).toEqual({
        deficitHalved: false,
        prompt: false,
      });
    });

    it('turns a Friday-to-Thursday pair, 13 days apart, into a weekly rate: 1.5 % over 13 days is not fast', async () => {
      const user = await history(BodyDirection.LoseFat, [
        ['2026-10-23', 80], // Friday
        ['2026-11-05', 78.8], // Thursday of the week after, 13 days on: -1.5 % = 0.81 % a week
        ['2026-11-12', 77.5], // 7 days on: -1.65 %
      ]);

      expect((await getReady(user, REST_DAY)).rateCheck).toEqual({
        deficitHalved: false,
        prompt: false,
      });
    });

    it('shows no halved deficit on a hard Activity day, where no deficit applies, and still shows it on other days', async () => {
      const user = await history(BodyDirection.LoseFat, [
        ['2026-10-27', 79],
        ['2026-11-03', 78],
      ]);
      await log(user, '2026-11-04', { minutes: 60, intensity: Intensity.Hard });

      const hard = await getReady(user, '2026-11-04');
      const rest = await getReady(user, REST_DAY);

      expect(hard.targets).toMatchObject({
        dayType: DayType.HardActivity,
        deficitKcal: 0,
        deficitHalved: false,
      });
      expect(hard.rateCheck).toEqual({ deficitHalved: false, prompt: false });
      expect(rest.targets).toMatchObject({ deficitKcal: -200, deficitHalved: true });
      expect(rest.rateCheck).toEqual({ deficitHalved: true, prompt: false });
    });

    it('takes the last weigh-in of each week', async () => {
      const user = await history(BodyDirection.LoseFat, [
        ['2026-10-23', 90], // replaced by the later one in the same week
        ['2026-10-27', 79],
        ['2026-11-03', 78],
      ]);

      expect((await getReady(user, REST_DAY)).rateCheck.deficitHalved).toBe(true);
    });
  });

  describe('recalculation', () => {
    it('keeps the basis weight until a weigh-in is 2 kg or more away, then follows it', async () => {
      const { user } = await setUp();
      const resting = async () => (await getReady(user, REST_DAY)).targets.restingKcal;
      const basis = async () => (await getReady(user, REST_DAY)).setup.weightKg;

      await postWeighIn(user, { weightKg: 81.9 });
      expect(await basis()).toBe(80);
      expect(await resting()).toBe(RESTING);

      await postWeighIn(user, { weightKg: 82 });
      expect(await basis()).toBe(82);
      expect(await resting()).toBe(RESTING + 20); // 10 kg x 2

      await postWeighIn(user, { weightKg: 80.1 });
      expect(await basis()).toBe(82);

      await postWeighIn(user, { weightKg: 80 });
      expect(await basis()).toBe(80);
      expect(await resting()).toBe(RESTING);
    });

    it('treats a loss like a gain, and counts 2 kg exactly', async () => {
      const { user } = await setUp();

      await postWeighIn(user, { weightKg: 78 });

      expect((await getReady(user, REST_DAY)).setup.weightKg).toBe(78);
    });

    it('ignores a weigh-in back-dated behind a later one', async () => {
      const { user } = await setUp();

      await postWeighIn(user, { weightKg: 70, date: '2026-10-01' });

      expect((await getReady(user, REST_DAY)).setup.weightKg).toBe(80);
    });

    it('changes nothing before the setup is saved', async () => {
      const { user } = await player();

      await postWeighIn(user, { weightKg: 60 });
      await putSetup(user, setupOf());

      expect((await getReady(user, REST_DAY)).setup.weightKg).toBe(80);
    });

    it('recalculates with a changed Goal or schedule with no second step', async () => {
      const { user } = await bodyPlayer(BodyDirection.LoseFat);
      expect((await getReady(user, REST_DAY)).targets.energyKcal).toBe(BASELINE - 400);

      // a new play pattern: not hard any more, so the planned Tuesday is moderate
      await resubmit(user, {
        playVaries: false,
        playMinutes: 60,
        playIntensity: Intensity.Moderate,
      });
      const { week } = await sessionsOf(user);
      const playDay = PLAY_DAYS.find((date) => !week.sessions.some((s) => s.date === date))!;

      const { targets } = await getReady(user, playDay);

      expect(targets).toMatchObject({
        dayType: DayType.Activity,
        deficitKcal: -400,
        energyKcal: BASELINE + 400 - 400, // (6 - 1) x 80 x 1 h
      });
    });
  });

  describe('Nutrition off (9b)', () => {
    const eatingDisorder = [ScreeningQuestion.EatingDisorder];

    it('is off with no targets, and refuses the setup with 422 and nothing stored', async () => {
      const { user } = await player({}, { yes: eatingDisorder });

      expect(await getNutrition(user, REST_DAY)).toEqual({ status: NutritionStatus.Off });
      const saved = await putSetup(user, setupOf());
      expect(saved.status).toBe(422);
      expect(saved.result).toEqual({
        status: SaveNutritionSetupStatus.Rejected,
        reason: SaveNutritionSetupRejection.NutritionOff,
      });
      const [row] = await api.db.select().from(profile).where(eq(profile.userId, user.userId));
      expect(row).toMatchObject({ sex: null, heightCm: null, nutritionWeightKg: null });
      expect(await api.db.select().from(weighIn).where(eq(weighIn.userId, user.userId))).toEqual(
        [],
      );
    });

    it('turns a saved setup off when a later Screening says so, and back on when the next one does not', async () => {
      const { user } = await setUp();
      expect((await getNutrition(user, REST_DAY)).status).toBe(NutritionStatus.Ready);

      await user.call(HttpMethod.Post, ApiPath.Screening, screeningSubmission(eatingDisorder));
      expect(await getNutrition(user, REST_DAY)).toEqual({ status: NutritionStatus.Off });

      await user.call(HttpMethod.Post, ApiPath.Screening, screeningSubmission());
      const back = await getNutrition(user, REST_DAY);
      expect(back.status).toBe(NutritionStatus.Ready);
    });

    it('refuses water with 422 while Nutrition is off, storing nothing, and takes it again once it is back on', async () => {
      const { user } = await setUp();
      const kept = waterOf({ date: TODAY });
      await postWater(user, kept);
      await user.call(HttpMethod.Post, ApiPath.Screening, screeningSubmission(eatingDisorder));

      const refused = await user.call(HttpMethod.Post, ApiPath.Water, waterOf({ date: TODAY }));
      const replay = await user.call(HttpMethod.Post, ApiPath.Water, kept);

      expect(refused.status).toBe(422);
      expect(await refused.json()).toEqual({ error: ApiErrorCode.NutritionOff });
      expect(replay.status).toBe(422);
      expect(
        await api.db.select().from(waterLog).where(eq(waterLog.userId, user.userId)),
      ).toHaveLength(1);

      await user.call(HttpMethod.Post, ApiPath.Screening, screeningSubmission());
      expect((await postWater(user, waterOf({ date: TODAY }))).status).toBe(200);
    });
  });

  describe('validation', () => {
    const bad: [string, Record<string, unknown>][] = [
      ['height under 120', { heightCm: 119.9 }],
      ['height over 230', { heightCm: 230.1 }],
      ['weight under the minimum', { weightKg: MIN_BODY_WEIGHT_KG - 0.01 }],
      ['weight over the maximum', { weightKg: MAX_BODY_WEIGHT_KG + 0.01 }],
      ['weight as text', { weightKg: '80' }],
      ['meals under 3', { mealsPerDay: 2 }],
      ['meals over 5', { mealsPerDay: 6 }],
      ['fractional meals', { mealsPerDay: 3.5 }],
      ['an unknown sex', { sex: 'other' }],
      ['an unknown activity', { everydayActivity: 'athlete' }],
      ['an unknown pattern', { eatingPattern: 'carnivore' }],
      ['an unknown effort', { cookingEffort: 'gourmet' }],
      ['an unknown allergen', { allergens: ['kale'] }],
      ['a repeated allergen', { allergens: [Allergen.Milk, Allergen.Milk] }],
      ['eleven dislikes', { dislikes: Array.from({ length: 11 }, (_, i) => `food ${i}`) }],
      ['a dislike of 41 characters', { dislikes: ['x'.repeat(41)] }],
      ['a blank dislike', { dislikes: ['   '] }],
      ['an unknown direction', { bodyDirection: 'bulk' }],
      ['a missing field', { sex: undefined }],
    ];

    it.each(bad)('rejects %s with 400, echoing nothing, and stores nothing', async (_, change) => {
      const { user } = await player({ goal: Goal.BodyComposition });

      const response = await user.call(HttpMethod.Put, `${ApiPath.Nutrition}/setup`, {
        ...setupOf(),
        ...change,
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: ApiErrorCode.InvalidRequest });
      expect((await getNutrition(user, REST_DAY)).status).toBe(NutritionStatus.Locked);
    });

    it('accepts the bounds themselves: 120 and 230 cm, 3 and 5 meals, ten 40-character dislikes', async () => {
      const { user } = await player();
      const edge = (change: Parameters<typeof setupOf>[0]) => putSetup(user, setupOf(change));

      expect((await edge({ heightCm: 120 })).status).toBe(200);
      expect((await edge({ heightCm: 230 })).status).toBe(200);
      expect((await edge({ weightKg: MIN_BODY_WEIGHT_KG })).status).toBe(200);
      expect((await edge({ weightKg: MAX_BODY_WEIGHT_KG })).status).toBe(200);
      expect((await edge({ mealsPerDay: 3 })).status).toBe(200);
      expect((await edge({ mealsPerDay: 5 })).status).toBe(200);
      expect(
        (await edge({ dislikes: Array.from({ length: 10 }, (_, i) => `${i}`.padEnd(40, 'x')) }))
          .status,
      ).toBe(200);
      expect((await edge({ allergens: Object.values(Allergen) })).status).toBe(200);
    });

    it('answers 400 for a date more than a day ahead, a malformed date, or none', async () => {
      const { user } = await setUp();

      for (const query of ['?date=2026-11-14', '?date=08/11/2026', '?date=', '']) {
        const response = await user.call(HttpMethod.Get, `${ApiPath.Nutrition}${query}`);
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: ApiErrorCode.InvalidRequest });
      }
      expect((await user.call(HttpMethod.Get, `${ApiPath.Nutrition}?date=2026-11-13`)).status).toBe(
        200,
      );
    });

    it('answers 401 without a token', async () => {
      const { user } = await player();

      expect(
        (await user.call(HttpMethod.Get, `${ApiPath.Nutrition}?date=${REST_DAY}`, undefined, false))
          .status,
      ).toBe(401);
      expect(
        (await user.call(HttpMethod.Put, `${ApiPath.Nutrition}/setup`, setupOf(), false)).status,
      ).toBe(401);
      expect((await user.call(HttpMethod.Post, ApiPath.Water, waterOf(), false)).status).toBe(401);
    });

    it('is held by the database too: the nine setup columns are all set or all null, and bounded', async () => {
      const { user } = await setUp();
      const change = async (userId: string, values: Partial<typeof profile.$inferInsert>) => {
        await api.db.update(profile).set(values).where(eq(profile.userId, userId));
      };
      const mine = user.userId;

      await expect(change(mine, { sex: null })).rejects.toThrow();
      await expect(change(mine, { heightCm: 119 })).rejects.toThrow();
      await expect(change(mine, { nutritionWeightKg: MAX_BODY_WEIGHT_KG + 1 })).rejects.toThrow();
      await expect(change(mine, { mealsPerDay: 6 })).rejects.toThrow();
      await expect(change(mine, { allergens: ['kale' as Allergen] })).rejects.toThrow();
      await expect(
        change(mine, { dislikes: Array.from({ length: 11 }, () => 'x') }),
      ).rejects.toThrow();
      await expect(change(mine, { bodyDirection: 'bulk' as BodyDirection })).rejects.toThrow();

      // a lone sex is refused; a direction alone is allowed (it is null for maintenance)
      const other = (await player()).user.userId;
      await expect(change(other, { sex: EnergySex.Male })).rejects.toThrow();
      await change(other, { bodyDirection: BodyDirection.LoseFat });
    });
  });

  describe('water', () => {
    it('adds 250 and 500 ml to the day’s total against the drinks target', async () => {
      const { user } = await setUp();

      await postWater(user, waterOf({ ml: WaterAmount.Small, date: TODAY }));
      await postWater(user, waterOf({ ml: WaterAmount.Large, date: TODAY }));
      await postWater(user, waterOf({ ml: WaterAmount.Large }));

      const today = await getReady(user, TODAY);
      expect(today.water).toEqual({ ml: 1250, targetMl: today.targets.drinksMl });
      expect((await getReady(user, '2026-11-11')).water.ml).toBe(0);
    });

    it('is idempotent on the id: a repeat returns the same row and counts once', async () => {
      const { user } = await setUp();
      const entry = waterOf({ ml: WaterAmount.Large, date: TODAY });

      const first = await postWater(user, entry);
      const again = await postWater(user, entry);
      // a replay of the id keeps the stored row, even if the retry names other values
      const changed = await postWater(user, {
        ...entry,
        ml: WaterAmount.Small,
        date: '2026-11-11',
      });

      expect(first).toEqual({
        status: 200,
        result: { id: entry.id, date: TODAY, ml: WaterAmount.Large },
      });
      expect(again).toEqual(first);
      expect(changed).toEqual(first);
      expect((await getReady(user, TODAY)).water.ml).toBe(500);
      expect(
        await api.db.select().from(waterLog).where(eq(waterLog.userId, user.userId)),
      ).toHaveLength(1);
    });

    it('takes only 250 or 500 ml, and a day no more than a day ahead, with 400 and nothing stored', async () => {
      const { user } = await setUp();
      const badBodies = [
        { ...waterOf(), ml: 100 },
        { ...waterOf(), ml: 300 },
        { ...waterOf(), ml: 750 },
        { ...waterOf(), ml: 0 },
        { ...waterOf(), ml: '250' },
        { ...waterOf(), id: 'not-a-uuid' },
        { ml: 250 },
        { ...waterOf(), date: '08/11/2026' },
        { ...waterOf(), date: '2026-11-14' },
      ];

      for (const body of badBodies) {
        const response = await user.call(HttpMethod.Post, ApiPath.Water, body);
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: ApiErrorCode.InvalidRequest });
      }
      expect(await api.db.select().from(waterLog).where(eq(waterLog.userId, user.userId))).toEqual(
        [],
      );
      expect((await postWater(user, waterOf({ date: '2026-11-13' }))).status).toBe(200);
    });

    it('keeps a log made earlier, however long ago, so a queued one is never lost', async () => {
      const { user } = await setUp();

      const old = await postWater(user, waterOf({ date: '2025-01-01' }));

      expect(old.status).toBe(200);
      expect((await getReady(user, '2025-01-01')).water.ml).toBe(250);
    });

    it('turns away an id that belongs to someone else with 409, and does not count it for either', async () => {
      const { user } = await setUp();
      const stranger = (await setUp()).user;
      const entry = waterOf();
      await postWater(stranger, entry);

      const clash = await user.call(HttpMethod.Post, ApiPath.Water, entry);

      expect(clash.status).toBe(409);
      expect(await clash.json()).toEqual({ error: ApiErrorCode.IdTaken });
      expect((await getReady(user, TODAY)).water.ml).toBe(0);
      expect((await getReady(stranger, TODAY)).water.ml).toBe(250);
    });

    it('is refused by the database for any other amount, even as the table owner', async () => {
      const { user } = await setUp();

      await expect(
        api.db.insert(waterLog).values({
          id: crypto.randomUUID(),
          userId: user.userId,
          date: TODAY,
          ml: 300 as WaterAmount,
        }),
      ).rejects.toThrow();
    });
  });

  describe('privacy', () => {
    it('never shows another user’s setup, weight or water', async () => {
      const { user } = await setUp();
      const stranger = (await setUp({ weightKg: 120, allergens: [Allergen.Fish] })).user;
      await postWater(stranger, waterOf({ ml: WaterAmount.Large, date: TODAY }));
      await postWeighIn(stranger, { weightKg: 140 });

      const ready = await getReady(user, TODAY);

      expect(ready.setup).toMatchObject({ weightKg: 80, allergens: [] });
      expect(ready.water.ml).toBe(0);
    });

    it('lets the app role neither write another user’s water nor change or delete its own', async () => {
      const { user } = await setUp();
      const stranger = (await setUp()).user;
      const entry = waterOf({ date: TODAY });
      await postWater(user, entry);

      await expect(
        withUser(api.db, stranger.userId, (tx) =>
          tx.insert(waterLog).values({
            id: crypto.randomUUID(),
            userId: user.userId,
            date: TODAY,
            ml: 250,
          }),
        ),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      for (const change of [
        (tx: UserTx) => tx.update(waterLog).set({ ml: 500 }).where(eq(waterLog.id, entry.id)),
        (tx: UserTx) => tx.delete(waterLog).where(eq(waterLog.id, entry.id)),
      ]) {
        await expect(withUser(api.db, user.userId, change)).rejects.toMatchObject({
          cause: { code: PG_INSUFFICIENT_PRIVILEGE },
        });
      }
    });

    it('reads only the caller’s water rows as the app role', async () => {
      const { user } = await setUp();
      const stranger = (await setUp()).user;
      await postWater(stranger, waterOf());

      expect(await withUser(api.db, user.userId, (tx) => tx.select().from(waterLog))).toEqual([]);
    });

    it('is part of the export, and goes with the account', async () => {
      const { user } = await setUp({ allergens: [Allergen.Sesame], dislikes: ['okra'] });
      const entry = waterOf({ ml: WaterAmount.Large, date: TODAY });
      await postWater(user, entry);
      await postWeighIn(user, { weightKg: 82 });

      const exported = userExportSchema.parse(
        await (await user.call(HttpMethod.Get, ApiPath.MeExport)).json(),
      );

      expect(exported.nutritionSetup).toEqual(
        setupOf({ allergens: [Allergen.Sesame], dislikes: ['okra'], weightKg: 82 }),
      );
      expect(exported.waterLogs).toEqual([
        { id: entry.id, date: TODAY, ml: 500, loggedAt: expect.any(String) },
      ]);

      expect((await user.call(HttpMethod.Delete, ApiPath.Me)).status).toBe(204);
      expect(await api.db.select().from(waterLog).where(eq(waterLog.userId, user.userId))).toEqual(
        [],
      );
      expect(await api.db.select().from(profile).where(eq(profile.userId, user.userId))).toEqual(
        [],
      );
    });

    it('exports a null setup before Unlock Meals', async () => {
      const { user } = await player();

      const exported = userExportSchema.parse(
        await (await user.call(HttpMethod.Get, ApiPath.MeExport)).json(),
      );

      expect(exported.nutritionSetup).toBeNull();
      expect(exported.waterLogs).toEqual([]);
    });
  });
});
