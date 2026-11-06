import type { PickSpec } from '@stamina/domain';
import { PROMPT_DATA_MARKER } from './config.ts';
import type { SessionPicksContext } from './types.ts';

/**
 * The prompt for filling one Session's slots. It carries the slot spec (slot, how many), each
 * slot's candidate ids, the ids already used this week, the Goal, the equipment and the sport,
 * and nothing else. It is data plus fixed instructions, so there is nowhere for a name, an age or
 * a health detail to go. Changing the text means changing `SESSION_PICKS_PROMPT_VERSION`.
 */
export function buildPicksPrompt(spec: PickSpec, context: SessionPicksContext): string {
  const data = {
    goal: context.goal,
    equipment: context.equipment,
    sport: context.sport,
    sportKeyMovements: context.sportMovements,
    slots: spec.slots.map(({ slot, count, candidateIds }) => ({
      slot,
      count,
      candidates: candidateIds,
    })),
    recentExerciseIds: spec.recentIds,
  };
  const instructions = [
    'You choose the exercises for one strength training Session.',
    "For every slot, choose exactly `count` exercise ids from that slot's `candidates`.",
    'Rules:',
    "- Use only ids listed in the slot's `candidates`. Never invent an id.",
    '- Never choose the same id twice in the Session, even if it is a candidate of two slots.',
    '- Prefer ids that are not in `recentExerciseIds`, so the week has variety.',
    '- Prefer exercises that support the goal and the sport and its key movements.',
    '- Give each pick a reason of at most one short sentence, in English.',
    'Answer with JSON only: {"picks":[{"slot":"<slot>","exerciseId":"<id>","reason":"<reason>"}]}.',
  ];
  return instructions.join('\n') + PROMPT_DATA_MARKER + JSON.stringify(data);
}
