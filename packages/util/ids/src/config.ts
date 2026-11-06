/** UUIDv7 layout (RFC 9562): 48-bit millisecond timestamp, 4-bit version, 12-bit sequence, 2-bit variant, 62 random bits. */
export const UUID_V7 = {
  bytes: 16,
  timestampBytes: 6,
  version: 0x70,
  variant: 0x80,
  /** Keeps the low six bits of byte 8; the top two are the variant. */
  variantRandomMask: 0x3f,
  /** The sequence counts ids made within one millisecond, so ids stay ordered; 12 bits. */
  sequenceMax: 0xfff,
  /** A fresh millisecond starts the sequence below this, leaving room to count up. */
  sequenceSeedMax: 0x1ff,
  /** Where the dashes go in the 32 hex digits. */
  dashAfterHexDigits: [8, 12, 16, 20],
} as const;

export const BYTE_VALUES = 256;
export const MS_BYTE_DIVISOR = 2 ** 8;
