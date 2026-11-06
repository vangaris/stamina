import { RecordStatus, type ApiClient, type LogSet, type SessionDetail } from '@stamina/contracts';
import { LoadGuidance } from '@stamina/domain';
import { newId } from '@stamina/ids';
import { createAppSync } from '../create-app-sync.ts';
import { createServices } from '../create-services.ts';
import { ServicesMode } from '../enums/services-mode.ts';
import { createProgram, getSessionDetail } from '../index.ts';
import type { Services, SyncRunner } from '../types.ts';
import { readyToTrain } from './ready-to-train.ts';

export interface SessionSetupOptions {
  /** Wraps the fake API, e.g. to record calls or make one fail. */
  wrapApi?: (api: ApiClient) => ApiClient;
  /** Replaces services (the Dexie adapters, in the reload test). */
  services?: Partial<Services>;
}

/**
 * A signed-up person with a fake Program, one Session opened online (so it is cached) and a
 * switch for the network. `weightKg` etc. are what a test logs; `setFor` builds a valid set.
 */
export async function setupSession({ wrapApi, services = {} }: SessionSetupOptions = {}) {
  const network = { online: true };
  const base = createServices({ mode: ServicesMode.Test });
  const setup = await readyToTrain(undefined, [], {
    api: wrapApi ? wrapApi(base.api) : base.api,
    auth: base.auth,
    network: { isOnline: () => network.online },
    ...services,
  });
  const created = await setup.mediator.send(createProgram());
  if (created.status !== RecordStatus.Saved) throw new Error('the Program was not created');
  const session = created.program.sessions[0];
  if (!session) throw new Error('the Program has no Session');
  const sync: SyncRunner = createAppSync({ services: setup.services, stores: setup.stores });
  const detail: SessionDetail = await setup.mediator.send(getSessionDetail(session.id));
  const exercise = detail.exercises.find(
    ({ loadGuidance }) => loadGuidance === LoadGuidance.RpeGuided,
  );
  if (!exercise?.easier) throw new Error('the Session has no RPE-guided exercise');

  const setFor = (setNumber: number, overrides: Partial<LogSet> = {}): LogSet => ({
    id: newId(),
    exerciseId: exercise.exerciseId,
    setNumber,
    weightKg: 42.5,
    reps: 5,
    rpe: 8,
    ...overrides,
  });

  return {
    ...setup,
    network,
    sync,
    sessionId: session.id,
    detail,
    exercise,
    setFor,
    server: base.api,
  };
}
