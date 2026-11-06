export enum ApiErrorCode {
  InternalError = 'internal_error',
  Unauthorized = 'unauthorized',
  /** The body is not JSON or does not match the contract. Never says which field, or what it held. */
  InvalidRequest = 'invalid_request',
  /** The Session is not the signed-in user's, or does not exist. The two are not told apart. */
  NotFound = 'not_found',
  /** A client-made record id already belongs to another Session, Activity or person. Not retryable. */
  IdTaken = 'id_taken',
}
