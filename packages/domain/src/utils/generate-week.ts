import { DEFAULT_RECOVERY_WINDOW_HOURS } from '../config.ts';
import { TrainingMode } from '../enums/training-mode.ts';
import type { GenerateWeekInput, GeneratedSession, GeneratedWeek } from '../types.ts';
import { chooseEmphasis } from './choose-emphasis.ts';
import { hardDays } from './hard-days.ts';
import { monthOf } from './month-of.ts';
import { pickExercises } from './pick-exercises.ts';
import { placeSessions } from './place-sessions.ts';
import { planFocuses } from './plan-focuses.ts';
import { prescribe } from './prescribe.ts';
import { weekDates } from './week-dates.ts';

/**
 * One week of a Block, by rules only: the Block's Emphasis, where the Sessions go, which
 * exercises fill every slot and how hard each is. Pure and deterministic. A heavy focus the
 * library cannot fill (for example every lower-body exercise touches an excluded knee) becomes a
 * Recovery Session (`planFocuses`); returns `null` only when even a Recovery Session cannot be
 * filled, never a half Session.
 */
export function generateWeek(input: GenerateWeekInput): GeneratedWeek | null {
  const { trainingWeek, sport, mode, weekInBlock, startsOn } = input;
  const limited = mode === TrainingMode.Limited;
  const week = weekDates(startsOn);

  const emphasis = chooseEmphasis({
    goal: input.goal,
    sport,
    mode,
    month: monthOf(startsOn),
  });

  const focuses = planFocuses({
    library: input.library,
    equipment: input.equipment,
    excludedAreas: input.excludedAreas,
    minutes: trainingWeek.sessionMinutes,
    limited,
    sport,
    sessionsPerWeek: trainingWeek.sessionsPerWeek,
  });
  if (focuses === null) return null;

  const placed = placeSessions({
    focuses,
    availableDays: trainingWeek.availableDays,
    week,
    hardDays: hardDays(input),
    recoveryWindowHours: sport?.recoveryWindowHours ?? DEFAULT_RECOVERY_WINDOW_HOURS,
  });

  if (placed.length < trainingWeek.sessionsPerWeek) return null;

  const exercisesById = new Map(input.library.map((exercise) => [exercise.id, exercise]));
  const usedInWeek = new Set<string>();
  const sessions: GeneratedSession[] = [];
  for (const slot of placed) {
    const picks = pickExercises({
      library: input.library,
      equipment: input.equipment,
      excludedAreas: input.excludedAreas,
      focus: slot.focus,
      minutes: trainingWeek.sessionMinutes,
      limited,
      sport,
      usedInWeek,
    });
    if (picks === null) return null;
    sessions.push({
      ...slot,
      minutes: trainingWeek.sessionMinutes,
      exercises: picks.map(({ exerciseId, slot: exerciseSlot }) => {
        usedInWeek.add(exerciseId);
        const exercise = exercisesById.get(exerciseId)!;
        return {
          exerciseId,
          slot: exerciseSlot,
          ...prescribe({
            slot: exerciseSlot,
            emphasis,
            weekInBlock,
            limited,
            rirSuitable: exercise.rirSuitable,
            needsEquipment: exercise.equipment.length > 0,
          }),
        };
      }),
    });
  }
  return { emphasis, startsOn, weekInBlock, limited, sessions };
}
