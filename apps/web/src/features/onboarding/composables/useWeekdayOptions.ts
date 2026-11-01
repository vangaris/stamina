import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { WEEKDAYS } from '../config.ts';
import { toOptions } from '../utils/to-options.ts';

/** One chip option per weekday, Monday first, named in the active language. */
export function useWeekdayOptions() {
  const { t } = useI18n();
  return computed(() => toOptions(WEEKDAYS, (day) => t(`onboarding.weekdays.${day}`)));
}
