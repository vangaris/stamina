import { getProfile, ProfileStatus, type Mediator } from '@stamina/app-core';
import { RoutePath } from '../../../enums/route-path.ts';

/**
 * Where a person goes once the safety steps are done: the Program reveal when they asked for a
 * training week, Today when they only want food. If the profile cannot be read the reveal is
 * shown anyway; it deals with a failed request itself.
 */
export async function routeAfterSafety(mediator: Mediator): Promise<RoutePath> {
  try {
    const state = await mediator.send(getProfile());
    const wantsTraining = state.status === ProfileStatus.Present && !!state.profile.trainingWeek;
    return wantsTraining ? RoutePath.Reveal : RoutePath.Today;
  } catch {
    return RoutePath.Reveal;
  }
}
