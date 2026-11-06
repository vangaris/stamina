import { createAppRegistry } from './create-app-registry.ts';
import { createMediator } from './create-mediator.ts';
import type { AppMediatorOptions, Mediator } from './types.ts';

export function createAppMediator({ services, stores }: AppMediatorOptions): Mediator {
  return createMediator({ services, stores, registry: createAppRegistry() });
}
