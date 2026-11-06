import {
  MAX_LOGGED_REPS,
  MAX_LOGGED_SETS,
  MAX_SESSION_MINUTES,
  MAX_SESSION_RPE,
  MAX_SET_RPE,
  MAX_WEIGHT_KG,
  MIN_SESSION_RPE,
  MIN_SET_RPE,
  Emphasis,
  ProgressionOutcome,
} from '@stamina/domain';
import { z } from 'zod';
import { SessionRejection } from './enums/session-rejection.ts';
import { RecordStatus } from './enums/record-status.ts';
import { programExerciseSchema, programSessionSchema } from './program-schema.ts';

/** One set as the person logged it. The id is made on the device, so a replay is recognised. */
export const logSetSchema = z.object({
  id: z.uuid(),
  /** The exercise actually done: the planned one or its tagged easier or harder variant. */
  exerciseId: z.string().min(1),
  /** 1 for the first set. */
  setNumber: z.number().int().min(1).max(MAX_LOGGED_SETS),
  /** Kilograms; 0 for bodyweight. */
  weightKg: z.number().min(0).max(MAX_WEIGHT_KG),
  /** Reps, or seconds for a timed hold. */
  reps: z.number().int().min(0).max(MAX_LOGGED_REPS),
  /** How hard the set felt, 6 to 10. */
  rpe: z.number().int().min(MIN_SET_RPE).max(MAX_SET_RPE),
});

/** A set as the server holds it. */
export const loggedSetSchema = logSetSchema;

/** The session RPE a person gives when finishing. The id is made on the device. */
export const finishSessionSchema = z.object({
  id: z.uuid(),
  rpe: z.number().int().min(MIN_SESSION_RPE).max(MAX_SESSION_RPE),
  /** How long it took; the planned length when absent. */
  minutes: z.number().int().min(1).max(MAX_SESSION_MINUTES).optional(),
});

/** A finished Session: its session RPE and Load (session RPE x minutes). */
export const finishedSessionSchema = z.object({
  id: z.uuid(),
  rpe: z.number().int().min(MIN_SESSION_RPE).max(MAX_SESSION_RPE),
  minutes: z.number().int().min(1).max(MAX_SESSION_MINUTES),
  load: z.number().int().min(1),
  finishedAt: z.iso.datetime(),
});

/** An exercise's tagged easier or harder variant. */
export const exerciseVariantSchema = z.object({
  exerciseId: z.string().min(1),
  name: z.object({ en: z.string(), el: z.string().nullable() }),
});

export const sessionExerciseSchema = programExerciseSchema.extend({
  /** The Session exercise's own id. */
  id: z.uuid(),
  easier: exerciseVariantSchema.nullable(),
  harder: exerciseVariantSchema.nullable(),
  /**
   * The weight to start with, from how this exercise went last time (`progression` says how it
   * was reached); `null` while there is no history, when the week-1 guidance applies.
   */
  suggestedWeightKg: z.number().min(0).nullable(),
  progression: z.enum(ProgressionOutcome).nullable(),
  /** Sets already logged for this Session, in set order. */
  loggedSets: z.array(loggedSetSchema),
});

/** One Session with everything the Session screen shows and what has been logged so far. */
export const sessionDetailSchema = programSessionSchema.omit({ exercises: true }).extend({
  emphasis: z.enum(Emphasis),
  exercises: z.array(sessionExerciseSchema).min(1),
  /** Set once the Session is finished. */
  finished: finishedSessionSchema.nullable(),
});

/** `GET /sessions/{id}`. */
export const sessionResponseSchema = z.object({ session: sessionDetailSchema });

/**
 * `POST /sessions/{id}/sets` answers `200` with `Saved` (`recorded` false for a replay of a set the
 * server already has) or `422` with `Rejected`.
 */
export const logSetResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal(RecordStatus.Saved), recorded: z.boolean() }),
  z.object({ status: z.literal(RecordStatus.Rejected), reason: z.enum(SessionRejection) }),
]);

/**
 * `POST /sessions/{id}/finish` answers `200` with `Saved` (the stored finish; `recorded` false
 * for a replay or a second finish, which changes nothing).
 */
export const finishSessionResultSchema = z.object({
  status: z.literal(RecordStatus.Saved),
  recorded: z.boolean(),
  finished: finishedSessionSchema,
});
