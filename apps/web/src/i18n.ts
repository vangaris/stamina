import {
  DEFAULT_LOCALE,
  formatMessage,
  messages,
  resolveLocale,
  type Locale,
  type MessageSchema,
} from '@stamina/i18n';
import { createI18n, type MessageCompiler, type MessageContext } from 'vue-i18n';

// Messages are ICU, not vue-i18n's own syntax: this compiler hands each one to intl-messageformat.
const icuCompiler: MessageCompiler = (message, { locale, key, onError }) => {
  if (typeof message !== 'string') {
    onError?.(new Error(`Message "${key}" is not a string`) as never);
    return () => key;
  }
  return (ctx: MessageContext) =>
    formatMessage(locale as Locale, message, ctx.values as Record<string, string>);
};

export const i18n = createI18n<[MessageSchema], Locale, false>({
  legacy: false,
  // Pre-filled from the phone; the profile setting replaces it once sign-in exists.
  locale: resolveLocale(navigator.languages),
  fallbackLocale: DEFAULT_LOCALE,
  messages,
  messageCompiler: icuCompiler,
});
