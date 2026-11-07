import { StopFlagStep } from '../enums/stop-flag-step.ts';
import type { StopOutcomeKind } from '../enums/stop-outcome-kind.ts';

/** The i18n key of the sheet's title at each step; the outcome step is titled by what it says. */
export function toSheetTitleKey(step: StopFlagStep, kind: StopOutcomeKind | undefined): string {
  switch (step) {
    case StopFlagStep.Options:
      return 'stopFlag.title';
    case StopFlagStep.Area:
      return 'stopFlag.area.title';
    case StopFlagStep.Outcome:
      return kind ? `stopFlag.outcome.${kind}.title` : 'stopFlag.title';
    case StopFlagStep.Recheck:
      return 'stopFlag.recheck.title';
  }
}
