import { SessionStatus } from '../enums/session-status.ts';
import type { Services, SessionState } from '../types.ts';

/**
 * Asks the API who the signed-in person is (the first call to the API creates the user row, so a
 * session only counts as signed in after it) and claims the local data for them, wiping what
 * belonged to someone else. Resolves the signed-in state; the caller publishes it.
 */
export async function claimSignedInState({
  api,
  localData,
}: Pick<Services, 'api' | 'localData'>): Promise<SessionState> {
  const { userId } = await api.me();
  await localData.claim(userId);
  return { status: SessionStatus.SignedIn, userId };
}
