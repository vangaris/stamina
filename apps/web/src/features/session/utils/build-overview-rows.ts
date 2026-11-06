import type { Locale } from '@stamina/i18n';
import { localizedName } from '../../program/index.ts';
import type { ExerciseView, OverviewRow } from '../types.ts';
import { toPrescriptionMessage } from './to-prescription-message.ts';

/** One row per exercise: where it sits, what it asks for and how many sets are done. */
export function buildOverviewRows(
  views: readonly ExerciseView[],
  current: number,
  locale: Locale,
): OverviewRow[] {
  return views.map((view, index) => ({
    index,
    slot: view.exercise.slot,
    name: localizedName(view, locale),
    prescription: toPrescriptionMessage(view.exercise),
    doneSets: view.doneSets,
    plannedSets: view.exercise.sets,
    current: index === current,
  }));
}
