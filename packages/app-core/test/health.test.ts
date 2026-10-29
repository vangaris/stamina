import { describe, expect, it } from 'vitest';
import { createAppMediator, createServices, getHealth, type HealthState } from '../src/index.ts';

function setup(api?: Partial<ReturnType<typeof createServices>['api']>) {
  const services = createServices('test');
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

    expect(result).toEqual({ kind: 'ok' });
    expect(writes).toEqual([{ kind: 'ok' }]);
  });

  it('reports a degraded API without throwing', async () => {
    const { mediator, writes } = setup({
      health: async () => ({ status: 'degraded', database: 'down' }),
    });

    expect(await mediator.send(getHealth())).toEqual({ kind: 'degraded' });
    expect(writes).toEqual([{ kind: 'degraded' }]);
  });

  it('maps a network failure to an unreachable state', async () => {
    const { mediator, writes } = setup({
      health: async () => {
        throw new TypeError('Failed to fetch');
      },
    });

    expect(await mediator.send(getHealth())).toEqual({ kind: 'unreachable' });
    expect(writes).toEqual([{ kind: 'unreachable' }]);
  });
});
