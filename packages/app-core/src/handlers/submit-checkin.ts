import { submitCheckinSchema, type SubmitCheckin } from '@stamina/contracts';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { Services, Stores, SubmitCheckinRequest } from '../types.ts';

/** `checkin.id` comes from `newId()`, made once when the person finishes the Check-in, so a resend is recognised. */
export const submitCheckin = (checkin: SubmitCheckin): SubmitCheckinRequest => ({
  type: RequestType.SubmitCheckin,
  checkin,
});

/**
 * Writes the Check-in on the device first (it then reads as the latest), then sends it; offline
 * (or when the network drops mid-send) it waits in the offline queue and resolves
 * `QUEUED_RESULT`. A repeat of an id the server has is not an error (`recorded` false). A
 * permanent client error takes the local Check-in back (`undoLocal`). Never logged: sleep,
 * soreness and energy are health data.
 */
export const submitCheckinDefinition = defineRequest<SubmitCheckinRequest, Services, Stores>({
  schema: z.object({
    type: z.literal(RequestType.SubmitCheckin),
    checkin: submitCheckinSchema,
  }),
  offline: OfflinePolicy.Queue,
  writeLocal: ({ checkin }, services) =>
    services.checkins.add(checkin, services.clock.wallTime().toISOString()),
  undoLocal: ({ checkin }, services) => services.checkins.remove(checkin.id),
  handler: ({ checkin }, { services }) => services.api.submitCheckin(checkin),
});
