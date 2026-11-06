import { validatePicks, type PickSpec } from '@stamina/domain';
import { AiCallStatus, AiPurpose, type AiGateway } from '../ai/index.ts';
import { buildPicksPrompt } from './build-picks-prompt.ts';
import { SESSION_PICKS_MAX_ATTEMPTS } from './config.ts';
import { sessionPicksSchema } from './picks-schema.ts';
import type { AiSessionPicks, SessionPicksContext } from './types.ts';

/**
 * Asks the AI to fill one Session from its candidates, or returns `null` and the caller uses the
 * rules picker. An answer is accepted only when `validatePicks` passes (every id a candidate of
 * its slot, exact counts, no duplicates). A failed call or a refused answer is tried once more;
 * after that, or at once when AI is unavailable, capped or switched off, the result is `null`.
 * Every call, accepted or not, is logged by the gateway.
 */
export async function pickSessionExercises(
  gateway: AiGateway,
  userId: string,
  spec: PickSpec,
  context: SessionPicksContext,
): Promise<AiSessionPicks | null> {
  const prompt = buildPicksPrompt(spec, context);
  for (let attempt = 0; attempt < SESSION_PICKS_MAX_ATTEMPTS; attempt += 1) {
    const result = await gateway.run({
      userId,
      request: { purpose: AiPurpose.SessionPicks, prompt, schema: sessionPicksSchema },
      check: ({ picks }) => {
        const validation = validatePicks(spec, picks);
        return validation.valid ? null : validation.problem;
      },
    });
    if (result.status === AiCallStatus.Accepted) {
      const validation = validatePicks(spec, result.object.picks);
      if (!validation.valid) throw new Error('accepted picks failed validation again');
      return {
        picks: validation.picks,
        reasons: new Map(result.object.picks.map((pick) => [pick.exerciseId, pick.reason])),
        model: result.model,
      };
    }
    if (result.status !== AiCallStatus.Rejected && result.status !== AiCallStatus.Failed) {
      return null;
    }
  }
  return null;
}
