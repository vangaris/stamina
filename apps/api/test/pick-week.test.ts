import {
  DEFAULT_EQUIPMENT,
  generateWeek,
  Goal,
  Intensity,
  TrainingMode,
  Weekday,
  type GenerateWeekInput,
} from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { AiCallStatus, type AiGateway } from '../src/ai/index.ts';
import { EXERCISE_DATA_DIR, loadExerciseLibrary } from '../src/exercises/node.ts';
import { pickWeek } from '../src/picks/index.ts';

const input: GenerateWeekInput = {
  goal: Goal.GeneralFitness,
  playDays: [],
  playVaries: true,
  playIntensity: Intensity.Easy,
  trainingWeek: {
    sessionsPerWeek: 3,
    sessionMinutes: 45,
    availableDays: [Weekday.Mon, Weekday.Wed, Weekday.Fri],
  },
  sport: null,
  mode: TrainingMode.Full,
  excludedAreas: [],
  equipment: DEFAULT_EQUIPMENT,
  library: await loadExerciseLibrary(EXERCISE_DATA_DIR),
  weekInBlock: 1,
  startsOn: '2026-11-06',
};
const rulesWeek = generateWeek(input)!;

/** A gateway whose every call fails after `callMs` on a clock the test owns. */
function slowFailingGateway(clock: { ms: number }, callMs: number) {
  let calls = 0;
  const gateway: AiGateway = {
    async run() {
      calls += 1;
      clock.ms += callMs;
      return { status: AiCallStatus.Failed, cause: new Error('slow') };
    },
  };
  return { gateway, calls: () => calls };
}

describe('waiting for the model while picking a week', () => {
  const sessions = rulesWeek.sessions.length;

  it('asks each Session twice when every call fails and time allows', async () => {
    const clock = { ms: 0 };
    const { gateway, calls } = slowFailingGateway(clock, 1);
    const { week } = await pickWeek(gateway, 'u', input, rulesWeek, { now: () => clock.ms });

    expect(calls()).toBe(sessions * 2);
    expect(week).toEqual(rulesWeek);
  });

  it('stops asking once the time budget is used up, and the rest of the week is the rules’', async () => {
    const clock = { ms: 0 };
    // Each call takes 20 s of a 30 s budget: the first Session gets its attempt and its retry
    // (the retry starts at 20 s), then 40 s have passed and no later Session is asked.
    const { gateway, calls } = slowFailingGateway(clock, 20_000);
    const { week, pickInfo } = await pickWeek(gateway, 'u', input, rulesWeek, {
      now: () => clock.ms,
      budgetMs: 30_000,
    });

    expect(calls()).toBe(2);
    expect(pickInfo.every((info) => info === null)).toBe(true);
    expect(week).toEqual(rulesWeek);
  });
});
