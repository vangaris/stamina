import { fromBase64, fromBase64Url, toBase64Url } from './base64.ts';
import {
  ALGORITHM,
  ENVELOPE_PARTS,
  ENVELOPE_SEPARATOR,
  IV_BYTES,
  KEY_USAGES,
  KEY_VERSION,
} from './config.ts';
import { FieldCipherFailure } from './enums/field-cipher-failure.ts';
import { FieldCipherError } from './field-cipher-error.ts';
import { isValidFieldKey } from './is-valid-field-key.ts';
import type { FieldCipher } from './types.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * AES-256-GCM over Web Crypto (Node 22 and Workers). Each call draws a random 12-byte IV, and the
 * envelope is `v1.<iv>.<ciphertext+tag>` in base64url. The associated data (the user ID) is
 * authenticated but not stored, so an envelope copied to another user's row fails to decrypt.
 *
 * @param keyBase64 standard base64 of exactly 32 bytes. Throws without echoing it when it is not.
 */
export function createFieldCipher(keyBase64: string): FieldCipher {
  if (!isValidFieldKey(keyBase64))
    throw new Error('field encryption key must be base64 of 32 bytes');
  const key = crypto.subtle.importKey('raw', fromBase64(keyBase64), ALGORITHM, false, KEY_USAGES);

  return {
    async encrypt(plaintext, aad) {
      const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
      const sealed = await crypto.subtle.encrypt(
        { name: ALGORITHM, iv, additionalData: encoder.encode(aad) },
        await key,
        encoder.encode(plaintext),
      );
      return [KEY_VERSION, toBase64Url(iv), toBase64Url(new Uint8Array(sealed))].join(
        ENVELOPE_SEPARATOR,
      );
    },

    async decrypt(envelope, aad) {
      const parts = envelope.split(ENVELOPE_SEPARATOR);
      if (parts.length !== ENVELOPE_PARTS)
        throw new FieldCipherError(FieldCipherFailure.MalformedEnvelope);
      const [version, ivText, sealedText] = parts as [string, string, string];
      if (version !== KEY_VERSION) throw new FieldCipherError(FieldCipherFailure.UnknownKeyVersion);
      const iv = fromBase64Url(ivText);
      const sealed = fromBase64Url(sealedText);
      if (iv?.length !== IV_BYTES || sealed === undefined) {
        throw new FieldCipherError(FieldCipherFailure.MalformedEnvelope);
      }
      try {
        const plain = await crypto.subtle.decrypt(
          { name: ALGORITHM, iv, additionalData: encoder.encode(aad) },
          await key,
          sealed,
        );
        return decoder.decode(plain);
      } catch {
        // The platform's error text is dropped: only the reason survives.
        throw new FieldCipherError(FieldCipherFailure.AuthenticationFailed);
      }
    },
  };
}
