import { fromBase64 } from './base64.ts';
import { KEY_BASE64_PATTERN, KEY_BYTES } from './config.ts';

/** Whether `value` is the base64 of exactly 32 bytes. Never throws and never reports the value. */
export function isValidFieldKey(value: string): boolean {
  return KEY_BASE64_PATTERN.test(value) && fromBase64(value).length === KEY_BYTES;
}
