import type { Exercise } from '@stamina/contracts';
import { eq, getTableColumns, notInArray, sql } from 'drizzle-orm';
import { exercise as exerciseTable } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { toExerciseRow } from './to-exercise-row.ts';

const updatable = Object.entries(getTableColumns(exerciseTable)).filter(([key]) => key !== 'id');

/**
 * Makes the `exercise` table equal to `exercises`, in one transaction: rows are upserted by id,
 * rows whose id is no longer in the data are deleted, and the easier/harder links are written in
 * a second pass so a link may point at a later row. Running it twice changes nothing. Run as the
 * table owner (`migrate()` does); the app role can only read the table.
 *
 * Stored Sessions (`session_exercise`) reference these rows by id, so the delete below fails on an
 * id that a stored Session still uses. Retiring such an exercise needs a decision first (for
 * example a `retired` flag instead of a delete).
 */
export async function syncExerciseLibrary(db: Db, exercises: readonly Exercise[]): Promise<void> {
  await db.transaction(async (tx) => {
    if (exercises.length > 0) {
      // Links are cleared here and rewritten below, so no row points at one that is about to go.
      await tx
        .insert(exerciseTable)
        .values(exercises.map(toExerciseRow))
        .onConflictDoUpdate({
          target: exerciseTable.id,
          set: Object.fromEntries(
            updatable.map(([key, column]) => [key, sql.raw(`excluded."${column.name}"`)]),
          ),
        });
    }

    await tx.delete(exerciseTable).where(
      exercises.length > 0
        ? notInArray(
            exerciseTable.id,
            exercises.map((exercise) => exercise.id),
          )
        : sql`true`,
    );

    for (const { id, easierId, harderId } of exercises) {
      if (easierId === null && harderId === null) continue;
      await tx.update(exerciseTable).set({ easierId, harderId }).where(eq(exerciseTable.id, id));
    }
  });
}
