import type { PipelineStep } from '../types.ts';

/** Starts the clock; later steps (log-safe) read the duration from `context.elapsedMs()`. */
export const timingStep: PipelineStep = (context, next) => {
  const { clock } = context.services;
  const startedAt = clock.now();
  return next({ ...context, elapsedMs: () => clock.now() - startedAt });
};
