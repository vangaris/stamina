import { toAppError } from '../utils/to-app-error.ts';
import type { PipelineStep } from '../types.ts';

/** Anything thrown further in becomes an `AppError`, so `send` rejects with nothing else. */
export const errorMapStep: PipelineStep = async (context, next) => {
  try {
    return await next(context);
  } catch (thrown) {
    throw toAppError(thrown);
  }
};
