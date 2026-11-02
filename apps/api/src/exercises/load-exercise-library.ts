import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { exerciseSchema, type Exercise } from '@stamina/contracts';
import { z } from 'zod';
import { EXERCISE_DATA_DIR, EXERCISE_DATA_EXTENSION } from './config.ts';
import { ExerciseLibraryError } from './exercise-library-error.ts';

const fileSchema = z.array(exerciseSchema);

/**
 * Reads every `*.json` file of the data directory (in name order) into one list of exercises.
 * Fails loudly, with one error naming every file and exercise id at fault, when a file is not
 * valid JSON or not a list of `exerciseSchema` entries, when an id appears twice (in one file or
 * across files), or when an `easierId` / `harderId` points at itself or at an id that is not in
 * the library. Never returns a partial library. Node only: the Worker does not carry the data.
 */
export async function loadExerciseLibrary(dir: string = EXERCISE_DATA_DIR): Promise<Exercise[]> {
  const files = (await readdir(dir))
    .filter((file) => file.endsWith(EXERCISE_DATA_EXTENSION))
    .sort();
  const problems: string[] = [];
  const exercises: { file: string; exercise: Exercise }[] = [];

  for (const file of files) {
    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(join(dir, file), 'utf-8'));
    } catch (error) {
      problems.push(`${file}: not readable JSON (${(error as Error).message})`);
      continue;
    }
    const parsed = fileSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const [index, ...path] = issue.path;
        const id = typeof index === 'number' ? (raw as { id?: unknown }[])[index]?.id : undefined;
        const where = typeof id === 'string' ? ` exercise "${id}"` : '';
        problems.push(`${file}:${where} ${path.map(String).join('.')} ${issue.message}`.trimEnd());
      }
      continue;
    }
    for (const exercise of parsed.data) exercises.push({ file, exercise });
  }

  const fileOf = new Map<string, string>();
  for (const { file, exercise } of exercises) {
    const first = fileOf.get(exercise.id);
    if (first !== undefined) {
      problems.push(`${file}: duplicate id "${exercise.id}" (first in ${first})`);
    } else {
      fileOf.set(exercise.id, file);
    }
  }
  for (const { file, exercise } of exercises) {
    for (const [field, target] of [
      ['easierId', exercise.easierId],
      ['harderId', exercise.harderId],
    ] as const) {
      if (target === null) continue;
      if (target === exercise.id) {
        problems.push(`${file}: exercise "${exercise.id}" ${field} points at itself`);
      } else if (!fileOf.has(target)) {
        problems.push(
          `${file}: exercise "${exercise.id}" ${field} "${target}" is not in the library`,
        );
      }
    }
  }

  if (problems.length > 0) {
    throw new ExerciseLibraryError(`Invalid exercise library:\n${problems.join('\n')}`);
  }
  return exercises.map(({ exercise }) => exercise);
}
