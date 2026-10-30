import { createMediator } from './create-mediator.ts';
import { RequestType } from './enums/request-type.ts';
import { handleGetHealth } from './handlers/get-health.ts';
import type { AppMediatorOptions, Mediator } from './types.ts';

export function createAppMediator(options: AppMediatorOptions): Mediator {
  return createMediator({ ...options, handlers: { [RequestType.GetHealth]: handleGetHealth } });
}
