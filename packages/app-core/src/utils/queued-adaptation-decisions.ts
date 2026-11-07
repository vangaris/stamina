import { RequestType } from '../enums/request-type.ts';
import type { OfflineQueue } from '../types.ts';

/** The ids of the Adaptations the person accepted or declined on this device that still wait in the offline queue. */
export async function queuedAdaptationDecisions(queue: OfflineQueue): Promise<Set<string>> {
  const decided = new Set<string>();
  for (const { request } of await queue.pending()) {
    const { type } = request;
    if (type === RequestType.AcceptAdaptation) {
      const { adaptation } = request as { adaptation?: { id?: unknown } };
      if (typeof adaptation?.id === 'string') decided.add(adaptation.id);
    } else if (type === RequestType.DeclineAdaptation) {
      const { adaptationId } = request as { adaptationId?: unknown };
      if (typeof adaptationId === 'string') decided.add(adaptationId);
    }
  }
  return decided;
}
