/** Encrypts and decrypts one text field. `aad` binds the envelope to its owner (the user ID). */
export interface FieldCipher {
  encrypt(plaintext: string, aad: string): Promise<string>;
  /** Throws `FieldCipherError` for a malformed, foreign or tampered envelope. */
  decrypt(envelope: string, aad: string): Promise<string>;
}
