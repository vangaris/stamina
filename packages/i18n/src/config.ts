import en from './locales/en.json' with { type: 'json' };
import el from './locales/el.json' with { type: 'json' };
import type { Locale } from './types.ts';

export const LOCALES = ['en', 'el'] as const satisfies readonly Locale[];
/** English is the source language and the fallback. */
export const DEFAULT_LOCALE: Locale = 'en';

export const messages = { en, el } as const satisfies Record<Locale, unknown>;
