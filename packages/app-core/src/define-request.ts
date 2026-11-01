import type { Request, RequestDefinition } from './types.ts';

/**
 * One definition per request type: its schema, offline policy and handler. Inference ties the
 * three to the same request type `R`; the registry then stores it with `R` erased, which is the
 * only cast, and safe because `createMediator` always hands a handler the request its own
 * schema parsed.
 */
export function defineRequest<R extends Request, Services, Stores>(
  definition: RequestDefinition<R, Services, Stores>,
): RequestDefinition<Request, Services, Stores> {
  return definition as unknown as RequestDefinition<Request, Services, Stores>;
}
