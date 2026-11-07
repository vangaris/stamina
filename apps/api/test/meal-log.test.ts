import {
  ApiPath,
  HttpMethod,
  NutritionStatus,
  userExportSchema,
  FOOD_ID_MAX_LENGTH,
  type LogMeal,
} from '@stamina/contracts';
import { MAX_MEALS_PER_DAY, MealLogStatus, ScreeningQuestion, TEMPLATES } from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mealLog, profile } from '../src/db/schema.ts';
import type { UserTx } from '../src/db/types.ts';
import { withUser } from '../src/db/with-user.ts';
import { ApiErrorCode } from '../src/enums/api-error-code.ts';
import { EXERCISE_DATA_DIR } from '../src/exercises/node.ts';
import {
  foodUser,
  getNutrition,
  getReady,
  mealLogOf,
  postMealLog,
  putSetup,
  setupOf,
} from './support/nutrition-fixtures.ts';
import {
  PG_INSUFFICIENT_PRIVILEGE,
  screeningSubmission,
  type FixtureUser,
  type TestApi,
} from './support/safety-fixtures.ts';
import { createScratchDatabase, type ScratchDatabase } from './support/scratch-database.ts';
import { startTestApi } from './support/test-api.ts';

const TODAY = '2026-11-12';
const TOMORROW = '2026-11-13';
const NOW = new Date(`${TODAY}T12:00:00.000Z`);
const TEMPLATE_ID = TEMPLATES[0]!.id;

describe('The meal log', () => {
  let api: TestApi;
  let scratch: ScratchDatabase;

  beforeAll(async () => {
    scratch = await createScratchDatabase(EXERCISE_DATA_DIR);
    api = await startTestApi({ databaseUrl: scratch.url, now: () => NOW });
  });
  afterAll(async () => {
    await api.close();
    await scratch.drop();
  });

  const statusesOf = async (user: FixtureUser, date = TODAY) =>
    (await getReady(user, date)).meals.map(({ status }) => status);

  it('shows no status before anything is logged', async () => {
    const user = await foodUser(api, { mealsPerDay: 4 });

    expect(await statusesOf(user)).toEqual([null, null, null, null]);
  });

  it('records ate it, something else and skipped on their own slots, for today by default', async () => {
    const user = await foodUser(api, { mealsPerDay: 5 });

    const ate = await postMealLog(
      user,
      mealLogOf({ slotIndex: 0, status: MealLogStatus.Ate, templateId: TEMPLATE_ID }),
    );
    await postMealLog(user, mealLogOf({ slotIndex: 2, status: MealLogStatus.Other }));
    await postMealLog(user, mealLogOf({ slotIndex: 4, status: MealLogStatus.Skipped }));

    expect(ate.status).toBe(200);
    expect(ate.result).toEqual({
      id: expect.any(String),
      date: TODAY,
      slotIndex: 0,
      status: MealLogStatus.Ate,
    });
    expect(await statusesOf(user)).toEqual([
      MealLogStatus.Ate,
      null,
      MealLogStatus.Other,
      null,
      MealLogStatus.Skipped,
    ]);
    expect(await statusesOf(user, '2026-11-11')).toEqual([null, null, null, null, null]);
  });

  it('keeps each day apart, today, an earlier day, and the day after', async () => {
    const user = await foodUser(api);

    await postMealLog(user, mealLogOf({ date: '2026-10-01', status: MealLogStatus.Skipped }));
    await postMealLog(user, mealLogOf({ date: TOMORROW, slotIndex: 1, status: MealLogStatus.Ate }));

    expect(await statusesOf(user, '2026-10-01')).toEqual([MealLogStatus.Skipped, null, null]);
    expect(await statusesOf(user, TOMORROW)).toEqual([null, MealLogStatus.Ate, null]);
    expect(await statusesOf(user)).toEqual([null, null, null]);
  });

  it('lets the latest log of a slot win, whichever way the person changes their mind', async () => {
    const user = await foodUser(api);
    const slot = { slotIndex: 1 };

    await postMealLog(user, mealLogOf({ ...slot, status: MealLogStatus.Ate }));
    expect((await statusesOf(user))[1]).toBe(MealLogStatus.Ate);
    await postMealLog(user, mealLogOf({ ...slot, status: MealLogStatus.Skipped }));
    expect((await statusesOf(user))[1]).toBe(MealLogStatus.Skipped);
    await postMealLog(user, mealLogOf({ ...slot, status: MealLogStatus.Other }));
    expect((await statusesOf(user))[1]).toBe(MealLogStatus.Other);
    await postMealLog(user, mealLogOf({ ...slot, status: MealLogStatus.Ate }));

    expect(await statusesOf(user)).toEqual([null, MealLogStatus.Ate, null]);
    expect(await api.db.select().from(mealLog).where(eq(mealLog.userId, user.userId))).toHaveLength(
      4,
    );
  });

  it('counts a repeat of an id once and answers with the row it stored', async () => {
    const user = await foodUser(api);
    const entry = mealLogOf({ status: MealLogStatus.Ate, templateId: TEMPLATE_ID });
    await postMealLog(user, entry);
    await postMealLog(user, mealLogOf({ status: MealLogStatus.Skipped }));

    const replay = await postMealLog(user, { ...entry, status: MealLogStatus.Other });

    expect(replay.result).toEqual({
      id: entry.id,
      date: TODAY,
      slotIndex: 0,
      status: MealLogStatus.Ate,
    });
    expect(await api.db.select().from(mealLog).where(eq(mealLog.userId, user.userId))).toHaveLength(
      2,
    );
    // The replay did not become the latest log: the skip made after the first tap still stands.
    expect((await statusesOf(user))[0]).toBe(MealLogStatus.Skipped);
  });

  it('stores the template the person saw, and nothing else about the dish', async () => {
    const user = await foodUser(api);
    const entry = mealLogOf({ templateId: TEMPLATE_ID, status: MealLogStatus.Ate });
    await postMealLog(user, entry);
    await postMealLog(user, mealLogOf({ slotIndex: 1, status: MealLogStatus.Skipped }));

    const rows = await api.db.select().from(mealLog).where(eq(mealLog.userId, user.userId));

    expect(rows.find(({ id }) => id === entry.id)).toMatchObject({
      date: TODAY,
      slotIndex: 0,
      status: MealLogStatus.Ate,
      templateId: TEMPLATE_ID,
    });
    expect(rows.find(({ id }) => id !== entry.id)?.templateId).toBeNull();
  });

  it('takes a day no more than a day ahead, with 400 and nothing stored for a later one', async () => {
    const user = await foodUser(api);

    const far = await postMealLog(user, mealLogOf({ date: '2026-11-14' }));
    const old = await postMealLog(user, mealLogOf({ date: '2025-01-01' }));

    expect(far.status).toBe(400);
    expect(old.status).toBe(200);
    expect(await api.db.select().from(mealLog).where(eq(mealLog.userId, user.userId))).toHaveLength(
      1,
    );
  });

  it('turns away a bad body with 400 and nothing stored, and never echoes it', async () => {
    const user = await foodUser(api);
    const good = mealLogOf();
    const bad: [string, unknown][] = [
      ['a slot below the first', { ...good, slotIndex: -1 }],
      ['a slot past the fifth', { ...good, slotIndex: MAX_MEALS_PER_DAY }],
      ['a fractional slot', { ...good, slotIndex: 1.5 }],
      ['a slot as text', { ...good, slotIndex: '0' }],
      ['no slot', { id: good.id, status: good.status }],
      ['an unknown status', { ...good, status: 'eaten' }],
      ['a status in capitals', { ...good, status: 'ATE' }],
      ['no status', { id: good.id, slotIndex: 0 }],
      ['an id that is not a uuid', { ...good, id: 'meal-1' }],
      ['no id', { slotIndex: 0, status: MealLogStatus.Ate }],
      ['an impossible date', { ...good, date: '2026-13-01' }],
      ['a date in the wrong shape', { ...good, date: '12/11/2026' }],
      ['an empty template id', { ...good, templateId: '' }],
      [
        'a template id longer than any id',
        { ...good, templateId: 'x'.repeat(FOOD_ID_MAX_LENGTH + 1) },
      ],
      ['a template of the wrong type', { ...good, templateId: 7 }],
      ['an array', [good]],
      ['nothing', null],
    ];

    for (const [, body] of bad) {
      const response = await user.call(HttpMethod.Post, ApiPath.MealLogs, body);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: ApiErrorCode.InvalidRequest });
    }
    const notJson = await fetch(`${api.baseUrl}${ApiPath.MealLogs}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${user.token}`, 'content-type': 'application/json' },
      body: '{',
    });
    expect(notJson.status).toBe(400);
    expect(await notJson.json()).toEqual({ error: ApiErrorCode.InvalidRequest });
    expect(await api.db.select().from(mealLog).where(eq(mealLog.userId, user.userId))).toEqual([]);
  });

  it('accepts the first and the last slot and every template id', async () => {
    const user = await foodUser(api);

    expect((await postMealLog(user, mealLogOf({ slotIndex: 0 }))).status).toBe(200);
    expect((await postMealLog(user, mealLogOf({ slotIndex: MAX_MEALS_PER_DAY - 1 }))).status).toBe(
      200,
    );
    for (const { id } of TEMPLATES) {
      expect((await postMealLog(user, mealLogOf({ slotIndex: 1, templateId: id }))).status).toBe(
        200,
      );
    }
  });

  it('stays tolerant of a template id this server does not know, so a newer app can log its dish', async () => {
    const user = await foodUser(api);

    const response = await postMealLog(user, mealLogOf({ templateId: 'vegan-breakfast-99' }));

    expect(response.status).toBe(200);
  });

  it('answers 401 without a token', async () => {
    const user = await foodUser(api);

    const response = await user.call(HttpMethod.Post, ApiPath.MealLogs, mealLogOf(), false);

    expect(response.status).toBe(401);
  });

  it('turns away an id that belongs to someone else with 409, and changes nothing for either', async () => {
    const user = await foodUser(api);
    const stranger = await foodUser(api);
    const entry = mealLogOf({ status: MealLogStatus.Ate });
    await postMealLog(stranger, entry);

    const clash = await user.call(HttpMethod.Post, ApiPath.MealLogs, {
      ...entry,
      status: MealLogStatus.Skipped,
    });

    expect(clash.status).toBe(409);
    expect(await clash.json()).toEqual({ error: ApiErrorCode.IdTaken });
    expect(await statusesOf(user)).toEqual([null, null, null]);
    expect((await statusesOf(stranger))[0]).toBe(MealLogStatus.Ate);
  });

  it('refuses with 422 nutrition_off while Nutrition is off, storing nothing, and takes logs again once it is back on', async () => {
    const user = await foodUser(api);
    const kept = mealLogOf({ status: MealLogStatus.Ate });
    await postMealLog(user, kept);
    await user.call(
      HttpMethod.Post,
      ApiPath.Screening,
      screeningSubmission([ScreeningQuestion.EatingDisorder]),
    );

    const refused = await user.call(HttpMethod.Post, ApiPath.MealLogs, mealLogOf());
    const replay = await user.call(HttpMethod.Post, ApiPath.MealLogs, kept);

    expect(refused.status).toBe(422);
    expect(await refused.json()).toEqual({ error: ApiErrorCode.NutritionOff });
    expect(replay.status).toBe(422);
    expect(await getNutrition(user, TODAY)).toEqual({ status: NutritionStatus.Off });
    expect(await api.db.select().from(mealLog).where(eq(mealLog.userId, user.userId))).toHaveLength(
      1,
    );

    await user.call(HttpMethod.Post, ApiPath.Screening, screeningSubmission());
    expect((await postMealLog(user, mealLogOf())).status).toBe(200);
  });

  it('keeps the logs across a changed setup, so a change of food setting never loses a tap', async () => {
    const user = await foodUser(api, { mealsPerDay: 3 });
    await postMealLog(user, mealLogOf({ slotIndex: 1, status: MealLogStatus.Skipped }));

    await putSetup(user, setupOf({ mealsPerDay: 5 }));

    expect(await statusesOf(user)).toEqual([null, MealLogStatus.Skipped, null, null, null]);
  });

  describe('in the database', () => {
    it('is refused any other status or slot, even as the table owner', async () => {
      const user = await foodUser(api);
      const row = { id: crypto.randomUUID(), userId: user.userId, date: TODAY };

      await expect(
        api.db.insert(mealLog).values({
          ...row,
          slotIndex: 0,
          status: 'eaten' as MealLogStatus,
        }),
      ).rejects.toThrow();
      await expect(
        api.db.insert(mealLog).values({
          ...row,
          slotIndex: MAX_MEALS_PER_DAY,
          status: MealLogStatus.Ate,
        }),
      ).rejects.toThrow();
      await expect(
        api.db.insert(mealLog).values({
          ...row,
          slotIndex: -1,
          status: MealLogStatus.Ate,
        }),
      ).rejects.toThrow();
    });

    it('lets the app role neither write another user’s log nor change or delete its own', async () => {
      const user = await foodUser(api);
      const stranger = await foodUser(api);
      const entry = mealLogOf();
      await postMealLog(user, entry);

      await expect(
        withUser(api.db, stranger.userId, (tx) =>
          tx.insert(mealLog).values({
            id: crypto.randomUUID(),
            userId: user.userId,
            date: TODAY,
            slotIndex: 0,
            status: MealLogStatus.Ate,
          }),
        ),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      for (const change of [
        (tx: UserTx) =>
          tx.update(mealLog).set({ status: MealLogStatus.Skipped }).where(eq(mealLog.id, entry.id)),
        (tx: UserTx) => tx.delete(mealLog).where(eq(mealLog.id, entry.id)),
      ]) {
        await expect(withUser(api.db, user.userId, change)).rejects.toMatchObject({
          cause: { code: PG_INSUFFICIENT_PRIVILEGE },
        });
      }
    });

    it('reads only the caller’s rows as the app role, and shows nobody else’s status on Meals', async () => {
      const user = await foodUser(api);
      const stranger = await foodUser(api);
      await postMealLog(stranger, mealLogOf({ status: MealLogStatus.Ate }));

      expect(await withUser(api.db, user.userId, (tx) => tx.select().from(mealLog))).toEqual([]);
      expect(await statusesOf(user)).toEqual([null, null, null]);
    });
  });

  describe('export and deletion', () => {
    it('is part of the export, oldest first, and goes with the account', async () => {
      const user = await foodUser(api);
      const first: LogMeal = mealLogOf({
        slotIndex: 2,
        status: MealLogStatus.Ate,
        templateId: TEMPLATE_ID,
        date: '2026-11-10',
      });
      const second = mealLogOf({ slotIndex: 2, status: MealLogStatus.Other, date: '2026-11-10' });
      await postMealLog(user, first);
      await postMealLog(user, second);

      const exported = userExportSchema.parse(
        await (await user.call(HttpMethod.Get, ApiPath.MeExport)).json(),
      );

      expect(exported.mealLogs).toEqual([
        {
          id: first.id,
          date: '2026-11-10',
          slotIndex: 2,
          status: MealLogStatus.Ate,
          templateId: TEMPLATE_ID,
          loggedAt: expect.any(String),
        },
        {
          id: second.id,
          date: '2026-11-10',
          slotIndex: 2,
          status: MealLogStatus.Other,
          templateId: null,
          loggedAt: expect.any(String),
        },
      ]);

      expect((await user.call(HttpMethod.Delete, ApiPath.Me)).status).toBe(204);
      expect(await api.db.select().from(mealLog).where(eq(mealLog.userId, user.userId))).toEqual(
        [],
      );
      expect(await api.db.select().from(profile).where(eq(profile.userId, user.userId))).toEqual(
        [],
      );
    });

    it('exports an empty list before any log', async () => {
      const user = await foodUser(api);

      const exported = userExportSchema.parse(
        await (await user.call(HttpMethod.Get, ApiPath.MeExport)).json(),
      );

      expect(exported.mealLogs).toEqual([]);
    });
  });
});
