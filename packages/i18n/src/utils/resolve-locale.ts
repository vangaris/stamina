import { DEFAULT_LOCALE, LOCALES } from '../config.ts';
import type { Locale } from '../enums/locale.ts';

/** First supported language among the phone's preferences ("el-GR" -> "el"), else English. */
export function resolveLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const language = tag.toLowerCase().split('-')[0];
    const match = LOCALES.find((l) => l === language);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}
