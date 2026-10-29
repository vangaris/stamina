import type { Handler, Request } from './mediator.ts';
import type { Services } from './services.ts';

export type HealthState = { kind: 'ok' } | { kind: 'degraded' } | { kind: 'unreachable' };

export interface Stores {
  /** Stores hold state only; the web app backs this with Pinia. */
  health: { set(state: HealthState): void };
}

export interface GetHealth extends Request<HealthState> {
  readonly type: 'GetHealth';
}

export const getHealth = (): GetHealth => ({ type: 'GetHealth' });

export const handleGetHealth: Handler<GetHealth, Services, Stores> = async (
  _request,
  { services, stores },
) => {
  let state: HealthState;
  try {
    const { status } = await services.api.health();
    state = { kind: status === 'ok' ? 'ok' : 'degraded' };
  } catch {
    state = { kind: 'unreachable' };
  }
  stores.health.set(state);
  return state;
};
