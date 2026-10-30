import { IntlMessageFormat } from 'intl-messageformat';
import en from './locales/en.json' with { type: 'json' };
import el from './locales/el.json' with { type: 'json' };

export { argumentNames, findTranslationProblems, flattenMessages } from './messages.ts';
export type { MessageTree } from './messages.ts';

export const LOCALES = ['en', 'el'] as const;
export type Locale = (typeof LOCALES)[number];
/** English is the source language and the fallback. */
export const DEFAULT_LOCALE: Locale = 'en';

export const messages = { en, el } as const satisfies Record<Locale, unknown>;
export type MessageSchema = typeof en;

/** First supported language among the phone's preferences ("el-GR" -> "el"), else English. */
export function resolveLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const language = tag.toLowerCase().split('-')[0];
    const match = LOCALES.find((l) => l === language);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

const formatters = new Map<string, IntlMessageFormat>();

/** Formats an ICU message for a locale; plural, select and number rules follow that locale. */
export function formatMessage(
  locale: Locale,
  message: string,
  values?: Record<string, string | number | Date>,
): string {
  const cacheKey = `${locale}\u0000${message}`;
  let formatter = formatters.get(cacheKey);
  if (!formatter) {
    formatter = new IntlMessageFormat(message, locale);
    formatters.set(cacheKey, formatter);
  }
  return String(formatter.format(values));
}
