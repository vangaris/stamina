import type { FieldCipherFailure } from './enums/field-cipher-failure.ts';

/** Thrown when decryption fails. Carries the reason only: never the plaintext, the envelope or the key. */
export class FieldCipherError extends Error {
  readonly failure: FieldCipherFailure;

  constructor(failure: FieldCipherFailure) {
    super(`field decryption failed: ${failure}`);
    this.name = 'FieldCipherError';
    this.failure = failure;
  }
}
