import { HealthStatus } from '@stamina/contracts';
import { HealthStateKind } from '../enums/health-state-kind.ts';
import { RequestType } from '../enums/request-type.ts';
import type { GetHealth, Handler, HealthState, Services, Stores } from '../types.ts';

export const getHealth = (): GetHealth => ({ type: RequestType.GetHealth });

export const handleGetHealth: Handler<GetHealth, Services, Stores> = async (
  _request,
  { services, stores },
) => {
  let state: HealthState;
  try {
    const { status } = await services.api.health();
    state = {
      kind: status === HealthStatus.Ok ? HealthStateKind.Ok : HealthStateKind.Degraded,
    };
  } catch {
    state = { kind: HealthStateKind.Unreachable };
  }
  stores.health.set(state);
  return state;
};
