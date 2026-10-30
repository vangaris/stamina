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
    const state: SessionState = session
      ? { status: SessionStatus.SignedIn, userId: session.userId }
      : { status: SessionStatus.SignedOut };
    stores.session.set(state);
    return state;
  },
});
