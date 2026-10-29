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

export interface Mediator {
  send<R extends Request>(request: R): Promise<ResultOf<R>>;
}

export interface MediatorOptions<Services, Stores> {
  services: Services;
  stores: Stores;
  /** Handlers keyed by `Request.type`. */
  handlers: Record<string, Handler<never, Services, Stores>>;
}

export function createMediator<Services, Stores>({
  services,
  stores,
  handlers,
}: MediatorOptions<Services, Stores>): Mediator {
  return {
    async send<R extends Request>(request: R): Promise<ResultOf<R>> {
      const handler = handlers[request.type] as unknown as Handler<R, Services, Stores> | undefined;
      if (!handler) throw new Error(`No handler registered for "${request.type}"`);
      return handler(request, { services, stores });
    },
  };
}
