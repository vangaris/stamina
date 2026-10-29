import { handleGetHealth } from './health.ts';
import { createMediator, type Mediator } from './mediator.ts';
import type { Services } from './services.ts';
import type { Stores } from './health.ts';

export * from './health.ts';
export * from './mediator.ts';
export * from './services.ts';

export function createAppMediator(options: { services: Services; stores: Stores }): Mediator {
  return createMediator({ ...options, handlers: { GetHealth: handleGetHealth } });
}
