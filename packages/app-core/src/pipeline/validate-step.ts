import { AppErrorCode } from '../enums/app-error-code.ts';
import { AppError } from '../errors/app-error.ts';
import type { PipelineStep } from '../types.ts';

/** Parses the request with its schema and passes the parsed (normalised) request on. */
export const validateStep: PipelineStep = (context, next) => {
  const parsed = context.definition.schema.safeParse(context.request);
  // The zod issues are dropped: they can echo the input.
  if (!parsed.success) throw new AppError(AppErrorCode.ValidationFailed);
  return next({ ...context, request: parsed.data });
};
