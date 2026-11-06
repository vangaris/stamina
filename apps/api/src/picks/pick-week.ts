import {
  buildPickSpec,
  generateWeek,
  type GenerateWeekInput,
  type GeneratedWeek,
  type PickedExercise,
} from '@stamina/domain';
import type { AiGateway } from '../ai/index.ts';
import { SESSION_PICKS_PROMPT_VERSION, SESSION_PICKS_TIME_BUDGET_MS } from './config.ts';
import { pickSessionExercises } from './pick-session-exercises.ts';
import type { PickedWeek, PickWeekOptions, StoredPickInfo } from './types.ts';

/**
 * Lets the AI choose the exercises of each Session of a rules-generated week, one call per Session
 * in date order, then rebuilds the week with those choices (`generateWeek` re-validates them).
 * Each Session sees the exercises already used earlier in the week. A Session the AI could not
 * fill keeps the rules picker's exercises, so the week is always complete. Focus, dates and
 * prescriptions are the rules' and do not change; only which exercises fill the slots can. Waiting
 * for the model stops after `budgetMs`: the Sessions not yet asked keep the rules' exercises.
 */
export async function pickWeek(
  gateway: AiGateway,
  userId: string,
  input: GenerateWeekInput,
  rulesWeek: GeneratedWeek,
  { sport = null, now = Date.now, budgetMs = SESSION_PICKS_TIME_BUDGET_MS }: PickWeekOptions = {},
): Promise<PickedWeek> {
  const deadline = now() + budgetMs;
  const withinBudget = () => now() < deadline;
  const usedInWeek = new Set<string>();
  const picks: (PickedExercise[] | null)[] = [];
  const pickInfo: (StoredPickInfo | null)[] = [];

  for (const session of rulesWeek.sessions) {
    const spec = buildPickSpec({
      library: input.library,
      equipment: input.equipment,
      excludedAreas: input.excludedAreas,
      focus: session.focus,
      minutes: session.minutes,
      limited: rulesWeek.limited,
      sport: input.sport,
      usedInWeek,
    });
    const picked =
      spec === null
        ? null
        : await pickSessionExercises(
            gateway,
            userId,
            spec,
            {
              goal: input.goal,
              equipment: input.equipment,
              sport,
              sportMovements: input.sport?.keyMovements ?? null,
            },
            withinBudget,
          );

    picks.push(picked?.picks ?? null);
    pickInfo.push(
      picked
        ? {
            model: picked.model,
            promptVersion: SESSION_PICKS_PROMPT_VERSION,
            reasons: picked.reasons,
          }
        : null,
    );
    for (const { exerciseId } of picked?.picks ?? session.exercises) usedInWeek.add(exerciseId);
  }

  const week = generateWeek({ ...input, picks });
  if (week === null) throw new Error('the rules week could not be rebuilt with the AI picks');
  return { week, pickInfo };
}
