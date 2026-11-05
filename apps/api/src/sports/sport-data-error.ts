/** The launch sport data files are not valid. The message names every file and field at fault. */
export class SportDataError extends Error {
  override readonly name = 'SportDataError';
}
