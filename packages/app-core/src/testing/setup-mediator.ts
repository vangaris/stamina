import { createAppMediator } from '../create-app-mediator.ts';
import { createServices } from '../create-services.ts';
import { ServicesMode } from '../enums/services-mode.ts';
import type { HealthState, LogEntry, Services, SessionState } from '../types.ts';

/** The mediator seam: `createServices({ mode: Test })` mocks, optionally overridden per test. */
export function setupMediator(overrides: Partial<Services> = {}) {
  const services: Services = { ...createServices({ mode: ServicesMode.Test }), ...overrides };
  const sessionWrites: SessionState[] = [];
  const healthWrites: HealthState[] = [];
  const logLines: LogEntry[] = [];
  const loggedServices: Services = {
    ...services,
    logger: overrides.logger ?? { log: (entry) => logLines.push(entry) },
  };
  const mediator = createAppMediator({
    services: loggedServices,
    stores: {
      health: { set: (state) => healthWrites.push(state) },
      session: { set: (state) => sessionWrites.push(state) },
    },
  });
  return { mediator, services: loggedServices, sessionWrites, healthWrites, logLines };
}
