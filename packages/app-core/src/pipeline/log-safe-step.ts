import { QUEUED_RESULT } from '../config.ts';
import { RequestOutcome } from '../enums/request-outcome.ts';
import type { PipelineContext, PipelineStep } from '../types.ts';

function log(context: PipelineContext, outcome: RequestOutcome): void {
  // A `LogEntry` has exactly these fields; never spread the request or the error in here.
  context.services.logger.log({
    requestType: context.request.type,
    outcome,
    durationMs: context.elapsedMs(),
  });
}

/** Logs request type, outcome and duration only: the payload carries emails and codes. */
export const logSafeStep: PipelineStep = async (context, next) => {
  try {
    const result = await next(context);
    log(context, result === QUEUED_RESULT ? RequestOutcome.Queued : RequestOutcome.Success);
    return result;
  } catch (thrown) {
    log(context, RequestOutcome.Failure);
    throw thrown;
  }
};
