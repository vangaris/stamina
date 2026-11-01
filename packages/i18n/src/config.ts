import en from './locales/en.json' with { type: 'json' };
import el from './locales/el.json' with { type: 'json' };
import { Locale } from './enums/locale.ts';

export const LOCALES: readonly Locale[] = Object.values(Locale);
/** English is the source language and the fallback. */
export const DEFAULT_LOCALE = Locale.En;

export const messages = { [Locale.En]: en, [Locale.El]: el } as const satisfies Record<
  Locale,
  unknown
>;
