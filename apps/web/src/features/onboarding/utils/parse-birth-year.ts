import { MIN_BIRTH_YEAR } from '@stamina/domain';
import { BIRTH_YEAR_LENGTH } from '../config.ts';

/** The year as a number, or `undefined` when the text is not a plausible birth year (four digits, 1900 to this year). */
export function parseBirthYear(text: string, currentYear: number): number | undefined {
  const trimmed = text.trim();
  if (trimmed.length !== BIRTH_YEAR_LENGTH || !/^\d+$/.test(trimmed)) return undefined;
  const year = Number(trimmed);
  return year >= MIN_BIRTH_YEAR && year <= currentYear ? year : undefined;
}
