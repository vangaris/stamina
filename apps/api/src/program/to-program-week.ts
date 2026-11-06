import { programWeekSchema, type ProgramWeek } from '@stamina/contracts';
import { addDays, DAYS_IN_WEEK, hardActivityDates } from '@stamina/domain';
import type { StoredWeek } from './types.ts';

/**
 * The stored week as the contract's `ProgramWeek`: Sessions by date, each with its exercises in
 * the order they are done. The week starts `(week - 1) * 7` days after the Block does. The hard
 * Activity dates come from the profile's play pattern now, not from the stored rows. The schema
 * also guards against a corrupt row.
 */
export function toProgramWeek({ block, sessions, exercises, play }: StoredWeek): ProgramWeek {
  const [first] = sessions;
  if (first === undefined) throw new Error('a stored week has at least one Session');
  const startsOn = addDays(block.startsOn, (first.weekInBlock - 1) * DAYS_IN_WEEK);
  return programWeekSchema.parse({
    block: {
      emphasis: block.emphasis,
      startsOn,
      weekInBlock: first.weekInBlock,
      limited: first.limited,
      beta: first.beta,
    },
    sessions: [...sessions]
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .map((row) => ({
        id: row.id,
        date: row.date,
        weekday: row.weekday,
        focus: row.focus,
        minutes: row.minutes,
        status: row.status,
        revision: row.revision,
        rulesVersion: row.rulesVersion,
        inputsHash: row.inputsHash,
        exercises: exercises
          .filter(({ row: exercise }) => exercise.sessionId === row.id)
          .sort((a, b) => a.row.position - b.row.position)
          .map(({ row: exercise, name }) => ({
            exerciseId: exercise.exerciseId,
            slot: exercise.slot,
            name,
            sets: exercise.sets,
            repMin: exercise.repMin,
            repMax: exercise.repMax,
            unit: exercise.unit,
            rir: exercise.rir,
            loadGuidance: exercise.loadGuidance,
            suggestedByAi: row.model !== null,
          })),
      })),
    hardActivityDates: play === null ? [] : hardActivityDates(startsOn, play),
  });
}
