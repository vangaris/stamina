import type { AiCallFailure } from './enums/ai-call-failure.ts';
import type { AiUsage } from './types.ts';

/**
 * A provider call that gave no usable answer. `usage` is set when the provider answered (and
 * billed) but the answer was unusable, so the gateway can still log the cost. The message never
 * holds the prompt or the answer.
 */
export class AiCallError extends Error {
  constructor(
    readonly failure: AiCallFailure,
    /** The model the call went to. */
    readonly model: string,
    readonly usage?: AiUsage,
  ) {
    super(`AI call failed: ${failure}`);
    this.name = 'AiCallError';
  }
}
