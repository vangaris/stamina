import { ApiPath } from '../enums/api-path.ts';
import type { AdaptationSubpath } from '../enums/adaptation-subpath.ts';

/** `/adaptations`, or `/adaptations/{id}/accept` and `/adaptations/{id}/decline`; shared by the client and the server's routes. */
export function adaptationPath(adaptationId?: string, subpath?: AdaptationSubpath): string {
  if (adaptationId === undefined) return ApiPath.Adaptations;
  const base = `${ApiPath.Adaptations}/${adaptationId}`;
  return subpath === undefined ? base : `${base}/${subpath}`;
}
