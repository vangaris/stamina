import { describe, expect, it } from 'vitest';
import { DatabaseStatus, HealthStatus } from '@stamina/contracts';
import {
  createAppMediator,
  createServices,
  getHealth,
  HealthStateKind,
  ServicesMode,
  type HealthState,
} from '../index.ts';

function setup(api?: Partial<ReturnType<typeof createServices>['api']>) {
  const services = createServices(ServicesMode.Test);
  const writes: HealthState[] = [];
  const mediator = createAppMediator({
    services: { ...services, api: { ...services.api, ...api } },
    stores: { health: { set: (state) => writes.push(state) } },
  });
  return { mediator, writes };
}

describe('getHealth query through the mediator', () => {
  it('returns the API state and records it in the health store', async () => {
    const { mediator, writes } = setup();

    const result = await mediator.send(getHealth());

    expect(result).toEqual({ kind: HealthStateKind.Ok });
    expect(writes).toEqual([{ kind: HealthStateKind.Ok }]);
  });

  it('reports a degraded API without throwing', async () => {
    const { mediator, writes } = setup({
      health: async () => ({ status: HealthStatus.Degraded, database: DatabaseStatus.Down }),
    });

    expect(await mediator.send(getHealth())).toEqual({ kind: HealthStateKind.Degraded });
    expect(writes).toEqual([{ kind: HealthStateKind.Degraded }]);
  });

  it('maps a network failure to an unreachable state', async () => {
    const { mediator, writes } = setup({
      health: async () => {
        throw new TypeError('Failed to fetch');
      },
    });

    expect(await mediator.send(getHealth())).toEqual({ kind: HealthStateKind.Unreachable });
    expect(writes).toEqual([{ kind: HealthStateKind.Unreachable }]);
  });
});
