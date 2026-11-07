import { adaptationSchema, type Adaptation } from '@stamina/contracts';
import { AdaptationStatus } from '@stamina/domain';
import type { StoredAdaptation } from './types.ts';

/** A stored Adaptation as the contract's `Adaptation`; its status comes from its decision. The schema also guards against a corrupt row. */
export function toAdaptation({ row, decision }: StoredAdaptation): Adaptation {
  return adaptationSchema.parse({
    id: row.id,
    ruleId: row.ruleId,
    change: row.change,
    params: row.params,
    basis: row.basis,
    validUntil: row.validUntil,
    status: decision?.decision ?? AdaptationStatus.Pending,
    createdAt: row.createdAt.toISOString(),
    decidedAt: decision?.decidedAt.toISOString() ?? null,
  });
}
