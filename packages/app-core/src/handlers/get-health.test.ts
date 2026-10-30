import { describe, expect, it } from 'vitest';
import { DatabaseStatus, HealthStatus } from '@stamina/contracts';
import { getHealth, HealthStateKind, createServices, ServicesMode } from '../index.ts';
import { setupMediator } from '../testing/setup-mediator.ts';

function setupWithApi(api: Partial<ReturnType<typeof createServices>['api']>) {
  const base = createServices({ mode: ServicesMode.Test });
  return setupMediator({ api: { ...base.api, ...api } });
}

describe('getHealth query through the mediator', () => {
  it('returns the API state and records it in the health store', async () => {
    const { mediator, healthWrites } = setupMediator();

    const result = await mediator.send(getHealth());

    expect(result).toEqual({ kind: HealthStateKind.Ok });
    expect(healthWrites).toEqual([{ kind: HealthStateKind.Ok }]);
  });

  it('reports a degraded API without throwing', async () => {
    const { mediator, healthWrites } = setupWithApi({
      health: async () => ({ status: HealthStatus.Degraded, database: DatabaseStatus.Down }),
    });

    expect(await mediator.send(getHealth())).toEqual({ kind: HealthStateKind.Degraded });
    expect(healthWrites).toEqual([{ kind: HealthStateKind.Degraded }]);
  });

  it('maps a network failure to an unreachable state', async () => {
    const { mediator, healthWrites } = setupWithApi({
      health: async () => {
        throw new TypeError('Failed to fetch');
      },
    });

    expect(await mediator.send(getHealth())).toEqual({ kind: HealthStateKind.Unreachable });
    expect(healthWrites).toEqual([{ kind: HealthStateKind.Unreachable }]);
  });

  it('still reports unreachable while the device is offline', async () => {
    const { mediator } = setupMediator({
      network: { isOnline: () => false },
      api: {
        health: async () => {
          throw new TypeError('Failed to fetch');
        },
        me: async () => {
          throw new Error('unused');
        },
      },
    });

    expect(await mediator.send(getHealth())).toEqual({ kind: HealthStateKind.Unreachable });
  });
});
