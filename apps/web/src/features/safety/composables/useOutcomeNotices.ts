import { computed } from 'vue';
import { i18n } from '../../../i18n.ts';
import type { ScreeningOutcomeView } from '../types.ts';
import { formatAreaList } from '../utils/format-area-list.ts';

/**
 * The short notices on the outcome screen, one per thing the Screening changed, in the person's
 * language: Nutrition off, a Goal switched to General fitness, body areas kept out of training.
 * Training continues after all of them. Empty when nothing changed.
 */
export function useOutcomeNotices(outcome: () => ScreeningOutcomeView) {
  const { t, locale } = i18n.global;

  return computed(() => {
    const { screening, goalChanged } = outcome();
    const areas = screening.excludedAreas;
    return [
      ...(screening.nutritionOff ? [t('screening.outcome.nutritionOff')] : []),
      ...(goalChanged ? [t('screening.outcome.goalChanged')] : []),
      ...(areas.length > 0
        ? [
            t('screening.outcome.excludedAreas', {
              count: areas.length,
              areas: formatAreaList(
                areas,
                (area) => t(`screening.bodyAreas.options.${area}`),
                locale.value,
              ),
            }),
          ]
        : []),
    ];
  });
}
