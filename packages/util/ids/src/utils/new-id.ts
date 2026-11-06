import { BYTE_VALUES, HEX_DIGITS_PER_BYTE, HEX_RADIX, UUID_V7 } from '../config.ts';

let lastMs = 0;
let sequence = 0;

/**
 * A UUIDv7 string, made on the device so a set or finish keeps one id from the moment it is
 * logged and a replay is recognised. Ids sort by creation time; several made in one millisecond
 * (or after the clock stepped back) still come out in order.
 */
export function newId(): string {
  const random = crypto.getRandomValues(new Uint8Array(UUID_V7.bytes));
  const now = Date.now();
  if (now > lastMs) {
    lastMs = now;
    sequence =
      (((random[0] ?? 0) * BYTE_VALUES + (random[1] ?? 0)) & UUID_V7.sequenceSeedMax) >>> 0;
  } else if (sequence < UUID_V7.sequenceMax) {
    sequence += 1;
  } else {
    // 4096 ids in one millisecond: borrow the next one rather than repeat or go backwards.
    lastMs += 1;
    sequence = 0;
  }

  const bytes = random;
  let remaining = lastMs;
  for (let index = UUID_V7.timestampBytes - 1; index >= 0; index -= 1) {
    bytes[index] = remaining % BYTE_VALUES;
    remaining = Math.floor(remaining / BYTE_VALUES);
  }
  bytes[UUID_V7.versionByte] = UUID_V7.version | (sequence >> UUID_V7.sequenceHighShift);
  bytes[UUID_V7.sequenceLowByte] = sequence & UUID_V7.sequenceLowMask;
  bytes[UUID_V7.variantByte] =
    UUID_V7.variant | ((bytes[UUID_V7.variantByte] ?? 0) & UUID_V7.variantRandomMask);

  const hex = Array.from(bytes, (byte) =>
    byte.toString(HEX_RADIX).padStart(HEX_DIGITS_PER_BYTE, '0'),
  ).join('');
  return UUID_V7.dashAfterHexDigits.reduceRight(
    (text, at) => `${text.slice(0, at)}-${text.slice(at)}`,
    hex,
  );
}
