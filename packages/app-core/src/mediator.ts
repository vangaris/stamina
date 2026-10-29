/** A command or query. `Result` is a phantom type: it never exists at runtime. */
export interface Request<Result = unknown> {
  readonly type: string;
  readonly __result?: Result;
}

export type ResultOf<R extends Request> = R extends Request<infer Result> ? Result : never;

export interface Context<Services, Stores> {
  services: Services;
  stores: Stores;
}

export type Handler<R extends Request, Services, Stores> = (
  request: R,
  context: Context<Services, Stores>,
) => Promise<ResultOf<R>>;

/** Pipeline steps wrap the handler: validate → log-safe → offline-queue → error-map → timing. */
export type PipelineStep<Services, Stores> = (
  request: Request,
  context: Context<Services, Stores>,
  next: () => Promise<unknown>,
) => Promise<unknown>;

export interface Mediator {
  send<R extends Request>(request: R): Promise<ResultOf<R>>;
}

export interface MediatorOptions<Services, Stores> {
  services: Services;
  stores: Stores;
  /** Handlers keyed by `Request.type`. */
  handlers: Record<string, Handler<never, Services, Stores>>;
  pipeline?: readonly PipelineStep<Services, Stores>[];
}

export function createMediator<Services, Stores>({
  services,
  stores,
  handlers,
  pipeline = [],
}: MediatorOptions<Services, Stores>): Mediator {
  const context: Context<Services, Stores> = { services, stores };
  return {
    send<R extends Request>(request: R): Promise<ResultOf<R>> {
      const handler = handlers[request.type];
      if (!handler) throw new Error(`No handler registered for "${request.type}"`);
      const run = pipeline.reduceRight<() => Promise<unknown>>(
        (next, step) => () => step(request, context, next),
        () => (handler as unknown as Handler<R, Services, Stores>)(request, context),
      );
      return run() as Promise<ResultOf<R>>;
    },
  };
}
