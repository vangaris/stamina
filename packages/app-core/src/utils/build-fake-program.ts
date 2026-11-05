import type { ProgramExercise, ProgramSession, ProgramWeek } from '@stamina/contracts';
import {
  Emphasis,
  LoadGuidance,
  PrescriptionUnit,
  SessionFocus,
  SessionSlot,
  SessionStatus,
  Weekday,
} from '@stamina/domain';
import { FAKE_PROGRAM, FAKE_PROGRAM_EXERCISES } from '../config.ts';

const WEEK_DAYS = Object.values(Weekday);
const MS_PER_DAY = 86_400_000;
const DAYS_IN_WEEK = 7;
const SUNDAY_UTC_INDEX = 0;

export interface FakeProgramInput {
  sessionsPerWeek: number;
  sessionMinutes: number;
  availableDays: readonly Weekday[];
  /** Limited mode: RIR never below `limitedMinRir`, flagged on the block. */
  limited: boolean;
  /** Generation time; the week starts the next UTC day. */
  now: Date;
}

const isoDate = (time: number) => new Date(time).toISOString().slice(0, 10);

const weekdayOfTime = (time: number): Weekday => {
  const index = new Date(time).getUTCDay();
  return WEEK_DAYS[(index === SUNDAY_UTC_INDEX ? DAYS_IN_WEEK : index) - 1]!;
};

/**
 * A small deterministic week for the fake API: one Session per chosen day (up to
 * `sessionsPerWeek`), alternating lower and upper, every slot filled. Not the real rules.
 */
export function buildFakeProgram(input: FakeProgramInput): ProgramWeek {
  const startMs = Date.UTC(
    input.now.getUTCFullYear(),
    input.now.getUTCMonth(),
    input.now.getUTCDate() + 1,
  );
  const rir = input.limited
    ? Math.max(FAKE_PROGRAM.weekRir, FAKE_PROGRAM.limitedMinRir)
    : FAKE_PROGRAM.weekRir;

  const exercise = (
    slot: SessionSlot,
    named: { exerciseId: string; name: { en: string; el: string | null } },
    prescription: Pick<
      ProgramExercise,
      'sets' | 'repMin' | 'repMax' | 'unit' | 'rir' | 'loadGuidance'
    >,
  ): ProgramExercise => ({ ...named, name: { ...named.name }, slot, ...prescription });

  const reps = (range: { min: number; max: number }) => ({
    repMin: range.min,
    repMax: range.max,
  });

  const sessionFor = (day: Weekday, number: number): ProgramSession => {
    const offset =
      (WEEK_DAYS.indexOf(day) - WEEK_DAYS.indexOf(weekdayOfTime(startMs)) + DAYS_IN_WEEK) %
      DAYS_IN_WEEK;
    const focus = number % 2 === 0 ? SessionFocus.Lower : SessionFocus.Upper;
    const plan =
      focus === SessionFocus.Lower ? FAKE_PROGRAM_EXERCISES.lower : FAKE_PROGRAM_EXERCISES.upper;
    const effort = { unit: PrescriptionUnit.Reps, loadGuidance: LoadGuidance.RpeGuided };
    return {
      id: `${FAKE_PROGRAM.idPrefix}${String(number + 1).padStart(FAKE_PROGRAM.idDigits, '0')}`,
      date: isoDate(startMs + offset * MS_PER_DAY),
      weekday: day,
      focus,
      minutes: input.sessionMinutes,
      status: SessionStatus.Planned,
      revision: 1,
      rulesVersion: FAKE_PROGRAM.rulesVersion,
      inputsHash: FAKE_PROGRAM.inputsHash,
      exercises: [
        exercise(SessionSlot.WarmUp, FAKE_PROGRAM_EXERCISES.warmUp, {
          sets: 1,
          ...reps(FAKE_PROGRAM.warmUpReps),
          unit: PrescriptionUnit.Reps,
          rir: null,
          loadGuidance: LoadGuidance.None,
        }),
        ...plan.main.map((named) =>
          exercise(SessionSlot.MainStrength, named, {
            sets: FAKE_PROGRAM.mainSets,
            ...reps(FAKE_PROGRAM.mainReps),
            ...effort,
            rir,
          }),
        ),
        exercise(SessionSlot.SportSupport, plan.support, {
          sets: FAKE_PROGRAM.accessorySets,
          ...reps(FAKE_PROGRAM.supportReps),
          ...effort,
          rir,
        }),
        exercise(SessionSlot.AccessoriesCore, plan.accessory, {
          sets: FAKE_PROGRAM.accessorySets,
          ...reps(FAKE_PROGRAM.accessoryReps),
          ...effort,
          rir,
        }),
        exercise(SessionSlot.CoolDown, FAKE_PROGRAM_EXERCISES.coolDown, {
          sets: 1,
          ...reps(FAKE_PROGRAM.coolDownSeconds),
          unit: PrescriptionUnit.Seconds,
          rir: null,
          loadGuidance: LoadGuidance.None,
        }),
      ],
    };
  };

  // Chosen days in date order from the day the week starts.
  const startIndex = WEEK_DAYS.indexOf(weekdayOfTime(startMs));
  const dayOrder = (day: Weekday) =>
    (WEEK_DAYS.indexOf(day) - startIndex + DAYS_IN_WEEK) % DAYS_IN_WEEK;
  const days = [...input.availableDays]
    .sort((a, b) => dayOrder(a) - dayOrder(b))
    .slice(0, input.sessionsPerWeek);

  return {
    block: {
      emphasis: Emphasis.Strength,
      startsOn: isoDate(startMs),
      weekInBlock: FAKE_PROGRAM.weekInBlock,
      limited: input.limited,
      beta: false,
    },
    sessions: days.map(sessionFor),
  };
}
