/** A sport could not be drafted: it does not exist, or it is not a draft. Never about the model output. */
export class SportDraftError extends Error {
  override readonly name = 'SportDraftError';
}
