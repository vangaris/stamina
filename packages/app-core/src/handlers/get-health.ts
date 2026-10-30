import { HealthStatus } from '@stamina/contracts';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { HealthStateKind } from '../enums/health-state-kind.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { GetHealth, HealthState, Services, Stores } from '../types.ts';

export const getHealth = (): GetHealth => ({ type: RequestType.GetHealth });

export const getHealthDefinition = defineRequest<GetHealth, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.GetHealth) }),
  // Offline is a state this query reports (`Unreachable`), not an error.
  offline: OfflinePolicy.Always,
  handler: async (_request, { services, stores }) => {
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
  },
});
