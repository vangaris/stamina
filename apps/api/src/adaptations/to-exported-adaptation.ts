import type { ExportedAdaptation } from '@stamina/contracts';
import { toAdaptation } from './to-adaptation.ts';
import type { StoredAdaptation } from './types.ts';

/** A stored Adaptation as the export lists it: the contract's `Adaptation` plus what it was raised on (`triggerKey`) and how often (`ask`). */
export function toExportedAdaptation(stored: StoredAdaptation): ExportedAdaptation {
  return { ...toAdaptation(stored), triggerKey: stored.row.triggerKey, ask: stored.row.ask };
}
