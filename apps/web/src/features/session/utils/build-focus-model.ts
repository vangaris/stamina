import { LoadGuidance, MAX_LOGGED_SETS } from '@stamina/domain';
import { localizedName } from '../../program/index.ts';
import type { FocusModel, FocusModelInput } from '../types.ts';
import { createNumberFormat } from './create-number-format.ts';
import { nextSetNumber } from './next-set-number.ts';
import { toTargetView } from './to-target-view.ts';

/** Everything Focus mode shows for the exercise at `position`; undefined where there is none. */
export function buildFocusModel({
  views,
  position,
  addingSet,
  locale,
}: FocusModelInput): FocusModel | undefined {
  const view = views[position];
  if (!view) return undefined;
  const { exercise } = view;
  const setNumber = nextSetNumber(exercise.loggedSets);
  const planComplete = view.doneSets >= exercise.sets;
  const showSteppers = !planComplete || addingSet;
  return {
    slot: exercise.slot,
    position: position + 1,
    total: views.length,
    name: localizedName(view, locale),
    swapped: view.swapped,
    target: toTargetView(view, createNumberFormat(locale)),
    setNumber,
    plannedSets: exercise.sets,
    doneSets: view.doneSets,
    dotTotal: Math.max(exercise.sets, view.doneSets + (showSteppers ? 1 : 0)),
    showSteppers,
    canAddSet: setNumber <= MAX_LOGGED_SETS,
    showWeight: exercise.loadGuidance === LoadGuidance.RpeGuided,
    unit: exercise.unit,
    hasNextExercise: position < views.length - 1,
    canSwap: view.swapped || exercise.easier !== null || exercise.harder !== null,
  };
}
