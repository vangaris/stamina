import {
  BodyArea,
  Equipment,
  EXERCISE_IMAGE_ORIGIN,
  ExerciseLicence,
  ExerciseLocation,
  ExerciseSource,
  ImageLicence,
  MovementPattern,
  SessionSlot,
} from '@stamina/domain';
import { z } from 'zod';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Attribution links are shown to people and followed, so never `javascript:` or plain http. */
const httpsUrl = () => z.url({ protocol: /^https$/ });

/** An exercise image from wger, unmodified, with everything its licence asks to be shown. */
export const exerciseImageSchema = z.object({
  /** Always on wger's own media origin: images are never copied or edited. */
  url: z.url().refine((url) => url.startsWith(EXERCISE_IMAGE_ORIGIN), {
    message: 'must be a wger media URL',
  }),
  author: z.string().trim().min(1),
  authorUrl: httpsUrl().nullable(),
  licence: z.enum(ImageLicence),
  licenceUrl: httpsUrl(),
  /** The wger page the image comes from. */
  sourceUrl: httpsUrl(),
  wgerExerciseId: z.number().int().positive(),
});

const localized = <T extends z.ZodType>(schema: T) =>
  z.object({ en: schema, el: schema.nullable() });

/**
 * One exercise of the curated library. The same shape is the data file, the database row and
 * the API answer. Greek fields exist and stay `null` until the localisation ticket fills them.
 */
export const exerciseSchema = z.object({
  /** Stable kebab-case id; the AI picks exercises by it. */
  id: z.string().regex(SLUG),
  source: z.enum(ExerciseSource),
  /** The id in the source dataset. */
  sourceId: z.string().min(1),
  licence: z.enum(ExerciseLicence),
  name: localized(z.string().trim().min(1)),
  instructions: localized(z.array(z.string().trim().min(1)).min(1)),
  /** Equipment needed beyond the body; empty means bodyweight. */
  equipment: z.array(z.enum(Equipment)),
  locations: z.array(z.enum(ExerciseLocation)).min(1),
  movementPattern: z.enum(MovementPattern),
  /** Every body area the exercise loads heavily; an excluded area removes the exercise. */
  highLoadAreas: z.array(z.enum(BodyArea)),
  slots: z.array(z.enum(SessionSlot)).min(1).max(2),
  /** Safe to prescribe by reps in reserve: not ballistic, not a stretch. */
  rirSuitable: z.boolean(),
  easierId: z.string().regex(SLUG).nullable(),
  harderId: z.string().regex(SLUG).nullable(),
  image: exerciseImageSchema.nullable(),
});

export const exerciseListResponseSchema = z.object({ exercises: z.array(exerciseSchema) });

/**
 * `GET /exercises?equipment=dumbbell,barbell&locations=home&slots=main-strength&excludeAreas=knee`.
 * Each parameter is a comma-separated list and may be given once. An absent parameter does not
 * narrow the result; an empty `equipment=` means bodyweight only. An unknown key is rejected: a
 * misspelt `excludedAreas` must never silently return everything.
 */
const list = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? (value === '' ? [] : value.split(',')) : value),
    z.array(item),
  );

export const exerciseQuerySchema = z.strictObject({
  equipment: list(z.enum(Equipment)).optional(),
  locations: list(z.enum(ExerciseLocation)).optional(),
  slots: list(z.enum(SessionSlot)).optional(),
  excludeAreas: list(z.enum(BodyArea)).optional(),
});
