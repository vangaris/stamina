import { defaultPipeline } from './pipeline/default-pipeline.ts';
import type {
  Mediator,
  MediatorOptions,
  PipelineContext,
  PipelineServices,
  Request,
  ResultOf,
} from './types.ts';

/**
 * `send` runs the request through the pipeline into the handler registered for its type.
 * Failures reject with an `AppError`; a type with no registered definition is a programming
 * error and rejects before the pipeline with a plain `Error`.
 */
export function createMediator<Services extends PipelineServices, Stores>({
  services,
  stores,
  registry,
}: MediatorOptions<Services, Stores>): Mediator {
  return {
    async send<R extends Request>(request: R): Promise<ResultOf<R>> {
      const definition = registry[request.type];
      if (!definition) throw new Error(`No handler registered for "${request.type}"`);

      const run = defaultPipeline.reduceRight<(context: PipelineContext) => Promise<unknown>>(
        (next, step) => (context) => step(context, next),
        (context) => definition.handler(context.request, { services, stores }),
      );
      return (await run({ request, definition, services, elapsedMs: () => 0 })) as ResultOf<R>;
    },
  };
}
