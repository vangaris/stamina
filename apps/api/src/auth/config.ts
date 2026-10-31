/** Neon Auth signs its JWTs with Ed25519; any other algorithm is rejected before key lookup. */
export const ACCEPTED_JWT_ALGORITHMS = ['EdDSA'];

/** Claims every token must carry; `exp` is what makes a stolen token short-lived. */
export const REQUIRED_JWT_CLAIMS = ['exp', 'sub'];

/** `Authorization: Bearer <jwt>` */
export const BEARER_PREFIX = 'bearer ';

/** Sent with every 401 (RFC 6750). */
export const WWW_AUTHENTICATE_CHALLENGE = 'Bearer';
