export enum ApiErrorCode {
  InternalError = 'internal_error',
  Unauthorized = 'unauthorized',
  /** The body is not JSON or does not match the contract. Never says which field, or what it held. */
  InvalidRequest = 'invalid_request',
}
