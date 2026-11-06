/** Why a provider call produced no usable answer; logged as the call's detail (never any content). */
export enum AiCallFailure {
  /** The provider answered with an error status. */
  Http = 'http',
  /** The request never got an answer (network error or timeout). */
  Network = 'network',
  /** The model declined to answer. */
  Refused = 'refused',
  /** The answer was cut off at the output limit. */
  Truncated = 'truncated',
  /** The answer was not JSON, or did not match the schema. */
  Malformed = 'malformed',
}
