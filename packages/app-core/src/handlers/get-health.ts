import type { GetHealth, Handler, HealthState, Services, Stores } from '../types.ts';

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
