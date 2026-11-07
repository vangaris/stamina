import { AdaptationChangeKind, AdaptationRule, AdaptationStatus, BodyArea } from '@stamina/domain';
import { z } from 'zod';
import { AdaptationRejection } from './enums/adaptation-rejection.ts';
import { RecordStatus } from './enums/record-status.ts';
import { programWeekSchema } from './program-schema.ts';

const isoDate = z.iso.date();

/** One Session revision a suggestion applies to. */
export const sessionRevisionRefSchema = z.object({
  sessionId: z.uuid(),
  revision: z.number().int().min(1),
});

/** What accepting a suggestion changes; `kind` says which. Mirrors the domain's `AdaptationChange`. */
export const adaptationChangeSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal(AdaptationChangeKind.MoveSession),
    sessionId: z.uuid(),
    from: isoDate,
    to: isoDate,
  }),
  z.object({ kind: z.literal(AdaptationChangeKind.SwapToRecovery), sessionId: z.uuid() }),
  z.object({ kind: z.literal(AdaptationChangeKind.DropSet), sessionId: z.uuid() }),
  z.object({ kind: z.literal(AdaptationChangeKind.LightenSession), sessionId: z.uuid() }),
  z.object({
    kind: z.literal(AdaptationChangeKind.SwapExercises),
    sessionId: z.uuid(),
    areas: z.array(z.enum(BodyArea)).min(1),
  }),
  z.object({
    kind: z.literal(AdaptationChangeKind.DeloadWeek),
    sessionIds: z.array(z.uuid()).min(1),
  }),
  z.object({
    kind: z.literal(AdaptationChangeKind.RepeatWeek),
    startsOn: isoDate,
    weekInBlock: z.number().int().min(1),
  }),
  z.object({ kind: z.literal(AdaptationChangeKind.RestartBlock), startsOn: isoDate }),
]);

/**
 * A suggestion as the server holds it. `params` are the whole numbers the rule's reason template
 * is filled with (see the domain's `AdaptationReasonParams`); the reason is never free text.
 * `basis` is what the suggestion was raised on: accepting echoes it back, and is refused when the
 * Program has moved on.
 */
export const adaptationSchema = z.object({
  id: z.uuid(),
  ruleId: z.enum(AdaptationRule),
  change: adaptationChangeSchema,
  params: z.record(z.string(), z.number()),
  basis: z.array(sessionRevisionRefSchema),
  /** The last day the suggestion is worth showing, or null until used or declined. */
  validUntil: isoDate.nullable(),
  status: z.enum(AdaptationStatus),
  createdAt: z.iso.datetime(),
  decidedAt: z.iso.datetime().nullable(),
});

/**
 * `GET /adaptations`: the person's pending suggestions that still apply, oldest first. The server
 * checks the rules before it answers, so a suggestion a trigger raised while the app was closed
 * (a missed week, a declined Deload due again) is here.
 */
export const adaptationListSchema = z.object({ adaptations: z.array(adaptationSchema) });

/** `POST /adaptations/{id}/accept`: the revisions the person saw, as the suggestion listed them in `basis`. */
export const acceptAdaptationSchema = z.object({ basis: z.array(sessionRevisionRefSchema) });

/**
 * `POST /adaptations/{id}/accept` answers `200` with `Saved` (the decided suggestion and the
 * Program as it now is; `recorded` false for a replay of an accept the server has) or `422` with
 * `Rejected` and the latest week to show instead (`null` when the Program no longer exists).
 */
export const acceptAdaptationResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal(RecordStatus.Saved),
    recorded: z.boolean(),
    adaptation: adaptationSchema,
    program: programWeekSchema,
  }),
  z.object({
    status: z.literal(RecordStatus.Rejected),
    reason: z.enum(AdaptationRejection),
    program: programWeekSchema.nullable(),
  }),
]);

/**
 * `POST /adaptations/{id}/decline` answers `200` with `Saved` (`recorded` false for a replay) or
 * `422` with `Rejected` (accepted already).
 */
export const declineAdaptationResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal(RecordStatus.Saved),
    recorded: z.boolean(),
    adaptation: adaptationSchema,
  }),
  z.object({ status: z.literal(RecordStatus.Rejected), reason: z.enum(AdaptationRejection) }),
]);

/** An Adaptation in the data export. */
export const exportedAdaptationSchema = adaptationSchema.extend({
  triggerKey: z.string(),
  ask: z.number().int().min(1),
});
