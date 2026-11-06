import type { PipelineStep } from '../types.ts';
import { errorMapStep } from './error-map-step.ts';
import { localWriteStep } from './local-write-step.ts';
import { logSafeStep } from './log-safe-step.ts';
import { offlineQueueStep } from './offline-queue-step.ts';
import { timingStep } from './timing-step.ts';
import { validateStep } from './validate-step.ts';

/**
 * Outermost first. errorMap wraps validate (the ticket lists validate first) so a validation
 * failure is mapped like every other error; logSafe sits inside errorMap and timing outside both.
 * localWrite follows validate and precedes offlineQueue: what the person did is on the device
 * before the request is queued or sent.
 */
export const defaultPipeline: readonly PipelineStep[] = [
  timingStep,
  errorMapStep,
  logSafeStep,
  validateStep,
  localWriteStep,
  offlineQueueStep,
];
