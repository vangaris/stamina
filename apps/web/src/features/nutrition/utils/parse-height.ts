import { MAX_HEIGHT_CM, MIN_HEIGHT_CM } from '@stamina/domain';
import { HEIGHT_PATTERN } from '../config.ts';

/** The centimetres a typed height stands for ("178"), or nothing when it is not a height Meals accepts. */
export function parseHeight(text: string): number | undefined {
  const trimmed = text.trim();
  if (!HEIGHT_PATTERN.test(trimmed)) return undefined;
  const heightCm = Number(trimmed);
  return heightCm >= MIN_HEIGHT_CM && heightCm <= MAX_HEIGHT_CM ? heightCm : undefined;
}
