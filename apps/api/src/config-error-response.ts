import type { ZodError } from 'zod';
import { ApiErrorCode } from './enums/api-error-code.ts';

/**
 * The reply for a deploy whose bindings fail `loadConfig`: a generic 500 for the caller, and one
 * log line naming the offending settings (never their values) for the operator.
 */
export function configErrorResponse(error: ZodError): Response {
  const settings = [...new Set(error.issues.map((issue) => issue.path.join('.')))];
  console.error(JSON.stringify({ error_type: 'ConfigError', settings }));
  return Response.json({ error: ApiErrorCode.InternalError }, { status: 500 });
}
