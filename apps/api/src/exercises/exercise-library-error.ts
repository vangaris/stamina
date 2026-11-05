/** The data files are not a valid library. The message names every file and exercise id at fault. */
export class ExerciseLibraryError extends Error {
  override readonly name = 'ExerciseLibraryError';
}
