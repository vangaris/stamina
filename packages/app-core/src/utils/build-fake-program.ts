import type { ProgramExercise, ProgramSession, ProgramWeek } from '@stamina/contracts';
import {
  addDays,
  DAYS_IN_WEEK,
  Emphasis,
  LoadGuidance,
  PrescriptionUnit,
  SessionFocus,
  SessionSlot,
  SessionStatus,
  Weekday,
  weekdayOf,
} from '@stamina/domain';
import { FAKE_PROGRAM, FAKE_PROGRAM_EXERCISES } from '../config.ts';
import type { FakeProgramInput } from '../types.ts';

const WEEK_DAYS = Object.values(Weekday);

/**
 * A small deterministic week for the fake API: one Session per chosen day (up to
 * `sessionsPerWeek`), alternating lower and upper, every slot filled. Not the real rules.
 */
export function buildFakeProgram(input: FakeProgramInput): Omit<ProgramWeek, 'hardActivityDates'> {
  const startsOn = addDays(input.now.toISOString().slice(0, 10), 1);
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

  // Chosen days in date order from the day the week starts.
  const startIndex = WEEK_DAYS.indexOf(weekdayOf(startsOn));
  const dayOrder = (day: Weekday) =>
    (WEEK_DAYS.indexOf(day) - startIndex + DAYS_IN_WEEK) % DAYS_IN_WEEK;

  const sessionFor = (day: Weekday, number: number): ProgramSession => {
    const offset = dayOrder(day);
    const focus = number % 2 === 0 ? SessionFocus.Lower : SessionFocus.Upper;
    const plan =
      focus === SessionFocus.Lower ? FAKE_PROGRAM_EXERCISES.lower : FAKE_PROGRAM_EXERCISES.upper;
    const effort = { unit: PrescriptionUnit.Reps, loadGuidance: LoadGuidance.RpeGuided };
    return {
      id: `${FAKE_PROGRAM.idPrefix}${String(number + 1).padStart(FAKE_PROGRAM.idDigits, '0')}`,
      date: addDays(startsOn, offset),
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
        // Limited mode has no sport-support slot (it is jumps and bounds); core fills its place.
        ...(input.limited
          ? []
          : [
              exercise(SessionSlot.SportSupport, plan.support, {
                sets: FAKE_PROGRAM.accessorySets,
                ...reps(FAKE_PROGRAM.supportReps),
                ...effort,
                rir,
              }),
            ]),
        ...(input.limited ? [plan.accessory, plan.limitedAccessory] : [plan.accessory]).map(
          (named) =>
            exercise(SessionSlot.AccessoriesCore, named, {
              sets: FAKE_PROGRAM.accessorySets,
              ...reps(FAKE_PROGRAM.accessoryReps),
              ...effort,
              rir,
            }),
        ),
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

  const days = [...input.availableDays]
    .sort((a, b) => dayOrder(a) - dayOrder(b))
    .slice(0, input.sessionsPerWeek);

  return {
    block: {
      emphasis: Emphasis.Strength,
      startsOn,
      weekInBlock: FAKE_PROGRAM.weekInBlock,
      limited: input.limited,
      beta: false,
    },
    sessions: days.map(sessionFor),
  };
}
