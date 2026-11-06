import type { Exercise } from '@stamina/contracts';
import { buildPickSpec, validatePicks } from '@stamina/domain';
import { AiCallError, AiPurpose, type AiProvider } from '../src/ai/index.ts';
import {
  SESSION_PICKS_PROMPT_VERSION,
  buildPicksPrompt,
  sessionPicksSchema,
} from '../src/picks/index.ts';
import type { CaseResult, EvalCase } from './types.ts';

/** The case's Session spec: the real library's candidates, with the first `recentCount` already used. */
function specFor(testCase: EvalCase, library: readonly Exercise[]) {
  const input = {
    library,
    equipment: testCase.equipment,
    excludedAreas: testCase.excludedAreas,
    focus: testCase.focus,
    minutes: testCase.minutes,
    limited: testCase.limited,
    sport: null,
    usedInWeek: new Set<string>(),
  };
  const open = buildPickSpec(input);
  if (open === null) return null;
  const recent = new Set(
    open.slots.flatMap((slot) => slot.candidateIds).slice(0, testCase.recentCount),
  );
  return buildPickSpec({ ...input, usedInWeek: recent });
}

/**
 * Asks the provider once per case, with the prompt production builds, and checks the first answer
 * with the production validators. No retry: the pass rate is how often the first answer is valid.
 * A case the library cannot build a spec for is a broken case and throws.
 */
export async function runSessionPicksEval(
  cases: readonly EvalCase[],
  library: readonly Exercise[],
  provider: AiProvider,
): Promise<{ results: CaseResult[]; model: string; promptVersion: string }> {
  const results: CaseResult[] = [];
  let model = 'unknown';
  for (const testCase of cases) {
    const spec = specFor(testCase, library);
    if (spec === null)
      throw new Error(`eval case ${testCase.id}: the library cannot fill its slots`);
    const prompt = buildPicksPrompt(spec, {
      goal: testCase.goal,
      equipment: testCase.equipment,
      sportMovements: testCase.sportMovements,
    });
    const base = { id: testCase.id, locale: testCase.locale, focus: testCase.focus };
    try {
      const answer = await provider.generateObject({
        purpose: AiPurpose.SessionPicks,
        prompt,
        schema: sessionPicksSchema,
      });
      model = answer.model;
      const validation = validatePicks(spec, answer.object.picks);
      results.push({
        ...base,
        failure: validation.valid ? null : validation.problem,
        costMicroUsd: answer.usage.costMicroUsd,
      });
    } catch (error) {
      if (!(error instanceof AiCallError)) throw error;
      model = error.model;
      results.push({
        ...base,
        failure: error.failure,
        costMicroUsd: error.usage?.costMicroUsd ?? 0,
      });
    }
  }
  return { results, model, promptVersion: SESSION_PICKS_PROMPT_VERSION };
}
