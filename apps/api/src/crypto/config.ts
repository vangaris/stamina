import type { webcrypto } from 'node:crypto';

/** Key version written in front of every envelope; a future key rotation adds `v2` and keeps reading `v1`. */
export const KEY_VERSION = 'v1';
/** Web Crypto algorithm name for field encryption. */
export const ALGORITHM = 'AES-GCM';
/** What the imported key may do. */
export const KEY_USAGES: webcrypto.KeyUsage[] = ['encrypt', 'decrypt'];
/** AES-256: the key is exactly 32 bytes. */
export const KEY_BYTES = 32;
/** The 96-bit nonce AES-GCM is designed for; a fresh random one per call. */
export const IV_BYTES = 12;
/** Separates the version, the IV and the ciphertext in an envelope (never part of base64url). */
export const ENVELOPE_SEPARATOR = '.';
export const ENVELOPE_PARTS = 3;
/** Standard (padded) base64 of a 32-byte key: 43 characters and one `=`. */
export const KEY_BASE64_PATTERN = /^[A-Za-z0-9+/]{43}=$/;
