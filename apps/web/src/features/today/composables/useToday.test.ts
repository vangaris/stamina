import { AppError, AppErrorCode, RequestType } from '@stamina/app-core';
import { SessionStatus } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { SessionProgress } from '../../program/index.ts';
import { MealSlotKind } from '../enums/meal-slot-kind.ts';
import { TimelineEntryKind } from '../enums/timeline-entry-kind.ts';
import { TodayStatus } from '../enums/today-status.ts';
import { makeProgram, makeSession, TODAY_DATE } from '../testing/make-program.ts';
import {
  makeLoggedActivity,
  makePlannedActivity,
  makeWeekLoad,
} from '../testing/make-week-load.ts';
import { setupToday } from '../testing/setup-today.ts';

const kinds = (entries: readonly { kind: TimelineEntryKind }[]) => entries.map((e) => e.kind);

describe('useToday', () => {
  it("lists today's Session, today's Activities and the wind-down, and the week's Load", async () => {
    const setup = setupToday();
    setup.state.week = makeWeekLoad({
      load: 540,
      average: 600,
      plannedActivities: [makePlannedActivity()],
    });

    await setup.flow.load();

    expect(setup.flow.status.value).toBe(TodayStatus.Ready);
    expect(setup.flow.date.value).toBe(TODAY_DATE);
    expect(kinds(setup.flow.entries.value)).toEqual([
      TimelineEntryKind.Session,
      TimelineEntryKind.Activity,
      TimelineEntryKind.WindDown,
    ]);
    expect(setup.flow.summary.value).toEqual({ load: 540, average: 600 });
  });

  it('leaves out a Session on another day and an Activity on another day', async () => {
    const setup = setupToday();
    setup.state.program = makeProgram({ sessions: [makeSession({ date: '2026-11-09' })] });
    setup.state.week = makeWeekLoad({
      activities: [makeLoggedActivity({ date: '2026-11-06' })],
    });

    await setup.flow.load();

    expect(kinds(setup.flow.entries.value)).toEqual([TimelineEntryKind.WindDown]);
  });

  it('still shows the day when the person has no Program', async () => {
    const setup = setupToday();
    setup.state.program = null;

    await setup.flow.load();

    expect(setup.flow.status.value).toBe(TodayStatus.Ready);
    expect(kinds(setup.flow.entries.value)).toEqual([TimelineEntryKind.WindDown]);
  });

  describe("where today's Session stands", () => {
    const sessionProgress = (entries: ReturnType<typeof setupToday>['flow']['entries']['value']) =>
      entries.find((entry) => entry.kind === TimelineEntryKind.Session);

    it('is not started with nothing logged', async () => {
      const setup = setupToday();
      await setup.flow.load();
      expect(sessionProgress(setup.flow.entries.value)).toMatchObject({
        session: { progress: SessionProgress.NotStarted },
      });
    });

    it('is in progress once a set is logged', async () => {
      const setup = setupToday();
      setup.state.detail = { finished: null, exercises: [{ loggedSets: [{}] }] };
      await setup.flow.load();
      expect(sessionProgress(setup.flow.entries.value)).toMatchObject({
        session: { progress: SessionProgress.InProgress },
      });
    });

    it('is done when the Program says so', async () => {
      const setup = setupToday();
      setup.state.program = makeProgram({
        sessions: [makeSession({ status: SessionStatus.Completed })],
      });
      await setup.flow.load();
      expect(sessionProgress(setup.flow.entries.value)).toMatchObject({
        session: { progress: SessionProgress.Done },
      });
    });

    it('is not started when the detail cannot be read', async () => {
      const setup = setupToday();
      setup.state.detailError = new AppError(AppErrorCode.Offline);
      await setup.flow.load();
      expect(sessionProgress(setup.flow.entries.value)).toMatchObject({
        session: { progress: SessionProgress.NotStarted },
      });
    });
  });

  it('draws the meals and water it is given, in time order, and none otherwise', async () => {
    const setup = setupToday(() => ({
      meals: [
        { id: 'dinner', slot: MealSlotKind.Dinner, at: 1200, title: undefined, status: null },
        { id: 'breakfast', slot: MealSlotKind.Breakfast, at: 450, title: 'Eggs', status: null },
      ],
      water: { ml: 500, targetMl: 2500 },
    }));

    await setup.flow.load();

    expect(kinds(setup.flow.entries.value)).toEqual([
      TimelineEntryKind.Session,
      TimelineEntryKind.Water,
      TimelineEntryKind.MealSlot,
      TimelineEntryKind.MealSlot,
      TimelineEntryKind.WindDown,
    ]);
  });

  it('is failed only when neither the Program nor the week could be read', async () => {
    const setup = setupToday();
    setup.state.programError = new AppError(AppErrorCode.Offline);
    await setup.flow.load();
    expect(setup.flow.status.value).toBe(TodayStatus.Ready);

    setup.state.weekError = new AppError(AppErrorCode.Offline);
    await setup.flow.load();
    expect(setup.flow.status.value).toBe(TodayStatus.Failed);
    expect(kinds(setup.flow.entries.value)).toEqual([TimelineEntryKind.WindDown]);
  });

  it('recovers when asked again after a failure', async () => {
    const setup = setupToday();
    setup.state.programError = new AppError(AppErrorCode.Offline);
    setup.state.weekError = new AppError(AppErrorCode.Offline);
    await setup.flow.load();
    setup.state.programError = undefined;
    setup.state.weekError = undefined;

    await setup.flow.load();

    expect(setup.flow.status.value).toBe(TodayStatus.Ready);
    expect(kinds(setup.flow.entries.value)).toContain(TimelineEntryKind.Session);
  });

  it('keeps what it has when a refresh cannot read the week', async () => {
    const setup = setupToday();
    setup.state.week = makeWeekLoad({ load: 300, average: 400 });
    await setup.flow.load();
    setup.state.weekError = new AppError(AppErrorCode.Offline);

    await setup.flow.load();

    expect(setup.flow.summary.value).toEqual({ load: 300, average: 400 });
  });

  it('sends the person to sign in again when the server says they are signed out', async () => {
    const setup = setupToday();
    setup.state.weekError = new AppError(AppErrorCode.Unauthorized);

    await setup.flow.load();

    expect(setup.onNavigate).toHaveBeenCalledWith(RoutePath.Start);
  });

  it('asks only for the Program, the week and the detail of the Session of today', async () => {
    const setup = setupToday();

    await setup.flow.load();

    expect(setup.requests.map((request) => request.type).sort()).toEqual(
      [RequestType.GetProgram, RequestType.GetWeekLoad, RequestType.GetSessionDetail].sort(),
    );
  });
});
