/** Why a field could not be decrypted. The messages built from these never carry data. */
export enum FieldCipherFailure {
  /** Not `v1.<iv>.<ciphertext>` in base64url. */
  MalformedEnvelope = 'malformed-envelope',
  /** The envelope names a key version this cipher does not hold. */
  UnknownKeyVersion = 'unknown-key-version',
  /** Wrong key, wrong associated data (another user), or a changed envelope. */
  AuthenticationFailed = 'authentication-failed',
}
