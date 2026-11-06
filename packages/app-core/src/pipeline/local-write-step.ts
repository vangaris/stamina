import type { PipelineStep } from '../types.ts';

/**
 * Local-first: runs the definition's `writeLocal` (if any) on the validated request before the
 * offline decision, so the write happens online and offline alike. It sits after validate so
 * only a valid request is written, and before the offline queue so a queued request is on the
 * device too. A replay from the queue skips the pipeline, so the write is not repeated.
 */
export const localWriteStep: PipelineStep = async (context, next) => {
  await context.definition.writeLocal?.(context.request, context.services);
  return next(context);
};
