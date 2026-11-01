/** The signing keys could not be fetched; the caller's token may be fine. Surfaces as a 500. */
export class KeySourceUnavailableError extends Error {
  constructor(cause: unknown) {
    super('signing keys unavailable', { cause });
    this.name = 'KeySourceUnavailableError';
  }
}
