import type { SavedScreening } from '@stamina/contracts';
import { ConsentPurpose, TrainingMode, type StopState } from '@stamina/domain';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import { SafetyStatus } from '../enums/safety-status.ts';
import type { GetSafety, SafetyState, Services, Stores } from '../types.ts';
import { mergeStopState } from '../utils/merge-stop-state.ts';
import { readThroughCache } from '../utils/read-through-cache.ts';
import { toStoredStopFlag } from '../utils/to-stored-stop-flag.ts';

export const getSafety = (): GetSafety => ({ type: RequestType.GetSafety });

/**
 * What the person has to do before the app opens: finish onboarding, give the missing consents,
 * take the Screening, see the referral, or (cleared) wait out a pause; otherwise they are ready.
 * A missing profile comes first (no health question is asked before onboarding's age and region
 * checks), then a consent missing at the current text version, even when an older Screening
 * exists. A referral comes before a pause. The Screening itself is never logged (the pipeline
 * logs no results).
 *
 * Every state with a Screening carries the `stop` state: the server's, merged with the stop flags
 * reported on this device that the server does not have yet, so a flag reported offline (or still
 * queued) pauses at once.
 *
 * `Always`, so a person already cleared reaches the app without signal. Only a cleared state is
 * ever cached: the cleared Screening and the stop state, written together on a `Ready` or
 * `Paused` answer (a `Paused` person is the same cleared person, and caching it is what keeps the
 * pause in force offline) and deleted together on any other answer from the server. Offline
 * serves the cached Screening with the cached stop state and the local flags merged: `Paused`
 * when that stop state pauses, otherwise `Ready`; with nothing cached, or a cached Screening
 * whose stop state is missing or unreadable (it could hide a pause), it rejects
 * `AppErrorCode.Offline` (the guard then sends the person to Screening). A `Referred` or other
 * non-cleared state is never served from the cache.
 */
export const getSafetyDefinition = defineRequest<GetSafety, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.GetSafety) }),
  offline: OfflinePolicy.Always,
  handler: (_request, { services }) =>
    readThroughCache<SafetyState>({
      isOnline: () => services.network.isOnline(),
      load: () => deriveSafety(services),
      save: async (state) => {
        if (state.status === SafetyStatus.Ready || state.status === SafetyStatus.Paused) {
          await services.planCache.saveClearedScreening(state.screening);
          await services.planCache.saveStop(state.stop);
        } else await services.planCache.deleteClearedScreening();
      },
      cached: async () => {
        const screening = await services.planCache.readClearedScreening();
        if (!screening) return undefined;
        const cachedStop = await services.planCache.readStop();
        if (!cachedStop) return undefined;
        return clearedState(screening, await withLocalFlags(services, cachedStop));
      },
    }),
});

const withLocalFlags = async (services: Services, stop: StopState) =>
  mergeStopState(stop, (await services.stopFlags.list()).map(toStoredStopFlag));

const clearedState = (screening: SavedScreening, stop: StopState): SafetyState => ({
  status: stop.pausing.length > 0 ? SafetyStatus.Paused : SafetyStatus.Ready,
  screening,
  stop,
});

async function deriveSafety(services: Services): Promise<SafetyState> {
  const { profileSaved, granted, screening, stop: serverStop } = await services.api.getSafety();
  const missing = Object.values(ConsentPurpose).filter((purpose) => !granted.includes(purpose));
  if (!profileSaved) return { status: SafetyStatus.ProfileNeeded };
  if (missing.length > 0) return { status: SafetyStatus.ConsentNeeded, missing };
  if (!screening) return { status: SafetyStatus.ScreeningNeeded };
  const stop = await withLocalFlags(services, serverStop);
  if (screening.trainingMode === TrainingMode.Referred) {
    return { status: SafetyStatus.Referred, screening, stop };
  }
  return clearedState(screening, stop);
}
