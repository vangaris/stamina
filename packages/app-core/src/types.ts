import type { ApiClient } from '@stamina/contracts';

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

export interface Services {
  api: ApiClient;
}

/** `'test'` gives in-memory mocks; otherwise real services pointed at the API. */
export type ServicesEnv = 'test' | { apiBaseUrl: string; fetch?: typeof fetch };

export type HealthState = { kind: 'ok' } | { kind: 'degraded' } | { kind: 'unreachable' };

export interface Stores {
  /** Stores hold state only; the web app backs this with Pinia. */
  health: { set(state: HealthState): void };
}

export interface GetHealth extends Request<HealthState> {
  readonly type: 'GetHealth';
}

export interface AppMediatorOptions {
  services: Services;
  stores: Stores;
}
