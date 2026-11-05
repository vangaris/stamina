// The Node-only interface of the exercise library: reading the data files and syncing them into
// the database (migrations, scripts, tests). The Worker never imports this file; it uses `index.ts`,
// and `worker-bundle.test.ts` fails if the data, loader or sync end up in the Worker bundle.
export { EXERCISE_DATA_DIR } from './config.ts';
export { ExerciseLibraryError } from './exercise-library-error.ts';
export { loadExerciseLibrary } from './load-exercise-library.ts';
export { syncExerciseLibrary } from './sync-exercise-library.ts';
