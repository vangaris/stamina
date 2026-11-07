import { BodyArea } from '../enums/body-area.ts';
import { Equipment } from '../enums/equipment.ts';
import { ExerciseLocation } from '../enums/exercise-location.ts';
import { Goal } from '../enums/goal.ts';
import { Intensity } from '../enums/intensity.ts';
import { MovementPattern } from '../enums/movement-pattern.ts';
import { SeasonKind } from '../enums/season-kind.ts';
import { SessionSlot } from '../enums/session-slot.ts';
import { TrainingMode } from '../enums/training-mode.ts';
import { Weekday } from '../enums/weekday.ts';
import type { SessionFocus } from '../enums/session-focus.ts';
import type {
  ActivityFact,
  AdaptationContext,
  AdaptationSession,
  CheckinFact,
  FinishedSessionFact,
  GenerationBasis,
  PlannableExercise,
  SportDemands,
} from '../types.ts';
import { generateWeek } from '../utils/generate-week.ts';
import { weekdayOf } from '../utils/weekday-of.ts';

/** A Monday. Week 1 of the fixture Programs starts here. */
export const WEEK_START = '2026-11-02';

/** A bodyweight exercise, or one that needs a dumbbell. Rated by reps in reserve unless `rirSuitable` is false. */
function exercise(
  id: string,
  movementPattern: MovementPattern,
  slot: SessionSlot,
  highLoadAreas: BodyArea[],
  { bodyweight = false, rirSuitable = true } = {},
): PlannableExercise {
  return {
    id,
    movementPattern,
    slots: [slot],
    highLoadAreas,
    equipment: bodyweight ? [] : [Equipment.Dumbbell],
    locations: [ExerciseLocation.Gym, ExerciseLocation.Home],
    rirSuitable,
  };
}

const { Squat, Hinge, Lunge, Push, Pull, Overhead, Core, Mobility } = MovementPattern;
const { Knee, Hip, LowerBack, Ankle, Shoulder, Elbow, UpperBack, Neck, Wrist } = BodyArea;

/**
 * A small library that fills every slot of a Session in every mode: the lower exercises load the
 * knee, hip and lower back except `squat-4` and `hinge-4`; the upper ones load the shoulder,
 * elbow and upper back except `push-3`, `pull-3` and `overhead-3`.
 */
export const LIBRARY: readonly PlannableExercise[] = [
  ...[1, 2, 3].map((n) =>
    exercise(`wu-${n}`, Mobility, SessionSlot.WarmUp, [], { bodyweight: true, rirSuitable: false }),
  ),
  ...[1, 2, 3].map((n) =>
    exercise(`cd-${n}`, Mobility, SessionSlot.CoolDown, [], {
      bodyweight: true,
      rirSuitable: false,
    }),
  ),
  exercise('squat-1', Squat, SessionSlot.MainStrength, [Knee, Hip]),
  exercise('squat-2', Squat, SessionSlot.MainStrength, [Knee]),
  exercise('squat-3', Squat, SessionSlot.MainStrength, [Hip]),
  exercise('squat-4', Squat, SessionSlot.MainStrength, []),
  exercise('hinge-1', Hinge, SessionSlot.MainStrength, [LowerBack, Hip]),
  exercise('hinge-2', Hinge, SessionSlot.MainStrength, [LowerBack]),
  exercise('hinge-3', Hinge, SessionSlot.MainStrength, [Hip]),
  exercise('hinge-4', Hinge, SessionSlot.MainStrength, []),
  exercise('lunge-1', Lunge, SessionSlot.MainStrength, [Knee, Hip]),
  exercise('lunge-2', Lunge, SessionSlot.MainStrength, [Knee, Ankle]),
  exercise('lunge-3', Lunge, SessionSlot.MainStrength, [Hip]),
  exercise('push-1', Push, SessionSlot.MainStrength, [Shoulder, Elbow]),
  exercise('push-2', Push, SessionSlot.MainStrength, [Shoulder]),
  exercise('push-3', Push, SessionSlot.MainStrength, []),
  exercise('pull-1', Pull, SessionSlot.MainStrength, [UpperBack, Elbow]),
  exercise('pull-2', Pull, SessionSlot.MainStrength, [Elbow]),
  exercise('pull-3', Pull, SessionSlot.MainStrength, []),
  exercise('overhead-1', Overhead, SessionSlot.MainStrength, [Shoulder]),
  exercise('overhead-2', Overhead, SessionSlot.MainStrength, [Shoulder, Neck]),
  exercise('overhead-3', Overhead, SessionSlot.MainStrength, []),
  exercise('jump-1', MovementPattern.JumpLand, SessionSlot.SportSupport, [Knee, Ankle], {
    bodyweight: true,
    rirSuitable: false,
  }),
  exercise('cod-1', MovementPattern.ChangeOfDirection, SessionSlot.SportSupport, [Ankle, Knee], {
    bodyweight: true,
    rirSuitable: false,
  }),
  exercise('rotation-1', MovementPattern.Rotation, SessionSlot.SportSupport, []),
  exercise('rotation-2', MovementPattern.Rotation, SessionSlot.SportSupport, [LowerBack]),
  exercise('carry-1', MovementPattern.Carry, SessionSlot.SportSupport, []),
  exercise('carry-2', MovementPattern.Carry, SessionSlot.SportSupport, [Wrist]),
  ...[1, 2, 3, 4].map((n) =>
    exercise(`core-${n}`, Core, SessionSlot.AccessoriesCore, [], { bodyweight: true }),
  ),
  ...[1, 2, 3].map((n) =>
    exercise(`mobility-${n}`, Mobility, SessionSlot.AccessoriesCore, [], {
      bodyweight: true,
      rirSuitable: false,
    }),
  ),
];

const sport = (recoveryWindowHours: { lower: number; upper: number }): SportDemands => ({
  energyMix: { aerobic: 30, repeatedSprint: 40, explosive: 30 },
  keyMovements: [],
  highLoadAreas: [],
  recoveryWindowHours,
  season: { kind: SeasonKind.YearRound, months: [] },
});

/** Padel: Tue and Fri are hard (matches); lower work needs more than 48 h clear, upper more than 24 h. */
export const PADEL_GENERATION: GenerationBasis = {
  goal: Goal.SportPerformance,
  trainingWeek: {
    sessionsPerWeek: 3,
    sessionMinutes: 45,
    availableDays: [Weekday.Mon, Weekday.Wed, Weekday.Thu, Weekday.Sat, Weekday.Sun],
  },
  sport: sport({ lower: 48, upper: 24 }),
  mode: TrainingMode.Full,
  excludedAreas: [],
  equipment: [Equipment.Dumbbell],
  library: LIBRARY,
  playDays: [Weekday.Tue, Weekday.Fri],
  playVaries: false,
  playIntensity: Intensity.Hard,
};

/** Basketball: Wed and Sat are hard; 2 Sessions a week, any day. */
export const BASKETBALL_GENERATION: GenerationBasis = {
  ...PADEL_GENERATION,
  trainingWeek: {
    sessionsPerWeek: 2,
    sessionMinutes: 45,
    availableDays: Object.values(Weekday),
  },
  playDays: [Weekday.Wed, Weekday.Sat],
};

/** Week 1 of a Program as the rules see it: ids `s1`, `s2`, ... by date, revision 1, nothing done. */
export function programSessions(
  generation: GenerationBasis,
  startsOn = WEEK_START,
  weekInBlock = 1,
): AdaptationSession[] {
  const week = generateWeek({ ...generation, weekInBlock, startsOn })!;
  return week.sessions.map((session, index) => ({
    ...session,
    id: `s${index + 1}`,
    revision: 1,
    finished: false,
    started: false,
  }));
}

/** An `AdaptationContext` for week 1 of the Program from `WEEK_START`, `today` and `now` at noon UTC; override anything. */
export function adaptationContext(
  overrides: Partial<AdaptationContext> & Pick<AdaptationContext, 'today'>,
): AdaptationContext {
  const generation = overrides.generation ?? PADEL_GENERATION;
  return {
    now: `${overrides.today}T12:00:00.000Z`,
    weekStartsOn: WEEK_START,
    weekInBlock: 1,
    programStartsOn: WEEK_START,
    sessions: overrides.sessions ?? programSessions(generation),
    finished: [],
    activities: [],
    checkins: [],
    loadEntries: [],
    generation,
    history: [],
    ...overrides,
  };
}

/** The Session with this id, or a failure: tests name Sessions they know exist. */
export function sessionOf(sessions: readonly AdaptationSession[], id: string): AdaptationSession {
  const found = sessions.find((session) => session.id === id);
  if (found === undefined) throw new Error(`no Session ${id}`);
  return found;
}

/**
 * Sessions of the padel week-1 shapes (`recovery`, `upper`, `lower`) put where the test wants
 * them: ids `s1`, `s2`, ... in the order given, revision 1, nothing done.
 */
export function layout(...entries: [SessionFocus, string][]): AdaptationSession[] {
  const shapes = programSessions(PADEL_GENERATION);
  return entries.map(([focus, date], index) => {
    const shape = shapes.find((session) => session.focus === focus)!;
    return { ...shape, id: `s${index + 1}`, date, weekday: weekdayOf(date) };
  });
}

/** An Activity: hard, unplanned, 90 minutes (Load 720) unless overridden. */
export function activityFact(
  id: string,
  date: string,
  overrides: Partial<ActivityFact> = {},
): ActivityFact {
  return {
    id,
    date,
    intensity: Intensity.Hard,
    minutes: 90,
    load: 720,
    planned: false,
    ...overrides,
  };
}

/** A Check-in with these answers: sleep, soreness, energy. */
export function checkinFact(
  id: string,
  date: string,
  [sleep, soreness, energy]: [number, number, number],
): CheckinFact {
  return { id, date, sleep, soreness, energy };
}

/** A finished Session: its planned day, the RPE the person gave, the lowest RIR it prescribed. */
export function finishedFact(
  date: string,
  rpe: number,
  lowestRir: number | null,
  finishedAt = `${date}T18:00:00.000Z`,
): FinishedSessionFact {
  return { date, rpe, lowestRir, finishedAt };
}
