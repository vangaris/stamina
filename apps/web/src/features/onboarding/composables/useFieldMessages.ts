import { useI18n } from 'vue-i18n';
import type { FieldErrors, OnboardingDraft } from '../types.ts';

/**
 * Turns the message key beside an answer into text in the active language. `params` fills
 * messages that quote a number ("at least {count} days").
 */
export function useFieldMessages(
  errors: () => FieldErrors,
  params: () => Record<string, number> = () => ({}),
) {
  const { t } = useI18n();
  return (field: keyof OnboardingDraft): string | undefined => {
    const key = errors()[field];
    return key ? t(key, params()) : undefined;
  };
}
