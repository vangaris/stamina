import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import { SessionStatus } from '../enums/session-status.ts';
import type { GetSession, Services, SessionState, Stores } from '../types.ts';

export const getSession = (): GetSession => ({ type: RequestType.GetSession });

export const getSessionDefinition = defineRequest<GetSession, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.GetSession) }),
  offline: OfflinePolicy.Never,
  handler: async (_request, { services, stores }) => {
    const session = await services.auth.getSession();
    if (!session) {
      const signedOut: SessionState = { status: SessionStatus.SignedOut };
      stores.session.set(signedOut);
      return signedOut;
    }
    // The first call to the API creates the user row. Email sign-in already made it; a Google
    // sign-in returns here without ever having called the API, so the row is made now.
    const { userId } = await services.api.me();
    const state: SessionState = { status: SessionStatus.SignedIn, userId };
    stores.session.set(state);
    return state;
  },
});
