import { PSEUDONYM_KEY_LABEL } from './config.ts';

const encoder = new TextEncoder();

const hmac = async (
  key: Uint8Array<ArrayBuffer>,
  message: string,
): Promise<Uint8Array<ArrayBuffer>> =>
  new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
      encoder.encode(message),
    ),
  );

/**
 * A stable pseudonym for a user in `llm_call`: HMAC-SHA256 of the user id under a key derived
 * from `secret` (the Screening key's text, bound to this one purpose). The same user always maps
 * to the same value, so the daily cap can count calls; nobody without the key can map a value
 * back to a person.
 */
export async function pseudonymizeUser(secret: string, userId: string): Promise<string> {
  const derived = await hmac(encoder.encode(secret), PSEUDONYM_KEY_LABEL);
  return [...(await hmac(derived, userId))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
