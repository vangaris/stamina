import type { Adaptation } from '@stamina/contracts';
import type { Weekday } from '@stamina/domain';
import type { AdaptationCardState } from '../enums/adaptation-card-state.ts';
import type { AdaptationCardView } from '../types.ts';
import { toChangeMessage } from './to-change-message.ts';
import { toReasonMessage } from './to-reason-message.ts';

export function toCardView(
  adaptation: Adaptation,
  state: AdaptationCardState,
  weekdayLabel: (weekday: Weekday) => string,
): AdaptationCardView {
  return {
    id: adaptation.id,
    state,
    change: toChangeMessage(adaptation.change, weekdayLabel),
    reason: toReasonMessage(adaptation),
  };
}
