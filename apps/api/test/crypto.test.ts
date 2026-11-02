import { describe, expect, it } from 'vitest';
import {
  createFieldCipher,
  FieldCipherError,
  FieldCipherFailure,
  isValidFieldKey,
} from '../src/crypto/index.ts';
import { TEST_ENCRYPTION_KEY } from './support/test-encryption-key.ts';

const OTHER_KEY = btoa(String.fromCharCode(...Array.from({ length: 32 }, (_, i) => 255 - i)));
const USER = '8c1f6f0e-5b1e-4d6e-9d44-3f0a4b1d2c11';
const OTHER_USER = 'd2a5a4c1-8b0e-4f7a-9a55-0e8f9d3b7a10';
const PLAINTEXT = '{"answers":{"heart-condition":true},"note":"SENTINEL-plain-ünïcode"}';

const failureOf = async (run: () => Promise<unknown>) => {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error('expected a failure');
};

const messageOf = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    return String(error);
  }
  return '';
};

describe('field cipher', () => {
  const cipher = createFieldCipher(TEST_ENCRYPTION_KEY);

  it('round-trips text, including non-ASCII and empty', async () => {
    for (const text of [PLAINTEXT, '', 'Καλημέρα']) {
      expect(await cipher.decrypt(await cipher.encrypt(text, USER), USER)).toBe(text);
    }
  });

  it('writes a versioned envelope of base64url parts with a 12-byte IV', async () => {
    const envelope = await cipher.encrypt(PLAINTEXT, USER);
    const [version, iv, sealed, ...rest] = envelope.split('.');

    expect(version).toBe('v1');
    expect(rest).toEqual([]);
    expect(iv).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(sealed).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(envelope).not.toContain(PLAINTEXT);
  });

  it('never repeats a ciphertext for the same plaintext', async () => {
    const envelopes = await Promise.all(
      Array.from({ length: 20 }, () => cipher.encrypt(PLAINTEXT, USER)),
    );

    expect(new Set(envelopes).size).toBe(20);
    expect(new Set(envelopes.map((e) => e.split('.')[1])).size).toBe(20);
  });

  it('fails with another key, another user or a changed envelope', async () => {
    const envelope = await cipher.encrypt(PLAINTEXT, USER);
    const [version, iv, sealed] = envelope.split('.') as [string, string, string];
    const flipped = `${sealed.slice(0, 4)}${sealed[4] === 'A' ? 'B' : 'A'}${sealed.slice(5)}`;

    const wrongKey = await failureOf(() => createFieldCipher(OTHER_KEY).decrypt(envelope, USER));
    const wrongUser = await failureOf(() => cipher.decrypt(envelope, OTHER_USER));
    const tampered = await failureOf(() => cipher.decrypt(`${version}.${iv}.${flipped}`, USER));

    for (const error of [wrongKey, wrongUser, tampered]) {
      expect(error).toBeInstanceOf(FieldCipherError);
      expect(error).toMatchObject({ failure: FieldCipherFailure.AuthenticationFailed });
    }
  });

  it('names malformed envelopes and unknown key versions without echoing them', async () => {
    const envelope = await cipher.encrypt(PLAINTEXT, USER);
    const [, iv, sealed] = envelope.split('.') as [string, string, string];

    const malformed = ['', 'v1', 'v1.x', `v1.${iv}`, `v1.${iv}.${sealed}.extra`, `v1.!!.${sealed}`];
    for (const bad of malformed) {
      expect(await failureOf(() => cipher.decrypt(bad, USER))).toMatchObject({
        failure: FieldCipherFailure.MalformedEnvelope,
      });
    }
    const unknown = await failureOf(() => cipher.decrypt(`v9.${iv}.${sealed}`, USER));
    expect(unknown).toMatchObject({ failure: FieldCipherFailure.UnknownKeyVersion });
  });

  it('keeps plaintext, key and envelope out of its errors', async () => {
    const envelope = await cipher.encrypt(PLAINTEXT, USER);

    const error = (await failureOf(() =>
      createFieldCipher(OTHER_KEY).decrypt(envelope, USER),
    )) as FieldCipherError;

    const text = `${error.message}${error.stack ?? ''}${JSON.stringify(error)}`;
    for (const secret of [PLAINTEXT, 'SENTINEL', TEST_ENCRYPTION_KEY, OTHER_KEY, envelope]) {
      expect(text).not.toContain(secret);
    }
  });

  it('rejects a key that is not base64 of 32 bytes, without printing it', () => {
    for (const bad of [
      '',
      'abc',
      btoa('0'.repeat(31)),
      btoa('0'.repeat(33)),
      `${TEST_ENCRYPTION_KEY}x`,
    ]) {
      expect(isValidFieldKey(bad)).toBe(false);
      expect(() => createFieldCipher(bad)).toThrow(/32 bytes/);
      if (bad) expect(messageOf(() => createFieldCipher(bad))).not.toContain(bad);
    }
    expect(isValidFieldKey(TEST_ENCRYPTION_KEY)).toBe(true);
  });
});
