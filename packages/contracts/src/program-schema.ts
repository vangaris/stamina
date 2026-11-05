import {
  Emphasis,
  LoadGuidance,
  PrescriptionUnit,
  SESSION_LENGTHS_MINUTES,
  SessionFocus,
  SessionSlot,
  SessionStatus,
  Weekday,
} from '@stamina/domain';
import { z } from 'zod';

const isoDate = z.iso.date();

/** One exercise of a Session with its prescription, in the order it is done. */
export const programExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  slot: z.enum(SessionSlot),
  /** The library's name, so a screen needs no second request. `el` is null until Greek is filled in. */
  name: z.object({ en: z.string(), el: z.string().nullable() }),
  sets: z.number().int().min(1),
  /** The rep range, or the hold in seconds when `unit` is seconds. */
  repMin: z.number().int().min(1),
  repMax: z.number().int().min(1),
  unit: z.enum(PrescriptionUnit),
  /** Reps in reserve to stop at; null where effort is not rated (warm-up, cool-down). */
  rir: z.number().int().min(0).max(5).nullable(),
  loadGuidance: z.enum(LoadGuidance),
});

/**
 * One planned Session. `revision`, `rulesVersion` and `inputsHash` are the reproducibility record:
 * the same inputs under the same rules version always give the same Session.
 */
export const programSessionSchema = z.object({
  id: z.uuid(),
  date: isoDate,
  weekday: z.enum(Weekday),
  focus: z.enum(SessionFocus),
  /** The length the person chose. At 30 the sport-support and accessories slots share one block. */
  minutes: z
    .number()
    .int()
    .refine((m) => (SESSION_LENGTHS_MINUTES as readonly number[]).includes(m)),
  status: z.enum(SessionStatus),
  revision: z.number().int().min(1),
  rulesVersion: z.number().int().min(1),
  inputsHash: z.string().length(64),
  exercises: z.array(programExerciseSchema).min(1),
});

export const programBlockSchema = z.object({
  emphasis: z.enum(Emphasis),
  /** The first day of the generated week; the week is this date and the six after it. */
  startsOn: isoDate,
  /** 1 to 3 build weeks, 4 the Deload. */
  weekInBlock: z.number().int().min(1).max(4),
  /** Limited mode caps applied: RPE at most 7, no power or plyometric work. */
  limited: z.boolean(),
  /** The sport is a requested one the person's Program uses before it is approved. */
  beta: z.boolean(),
});

export const programWeekSchema = z.object({
  block: programBlockSchema,
  sessions: z.array(programSessionSchema).min(1),
});

/** `GET /program` and `POST /program`: the week, or null while there is no Program yet. */
export const programResponseSchema = z.object({ program: programWeekSchema.nullable() });
