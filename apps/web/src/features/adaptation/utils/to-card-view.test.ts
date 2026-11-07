import { describe, expect, it } from 'vitest';
import { AdaptationCardState } from '../enums/adaptation-card-state.ts';
import { makeAdaptation } from '../testing/make-adaptation.ts';
import { toCardView } from './to-card-view.ts';

describe('toCardView', () => {
  it('carries the id, the state and both sentences', () => {
    const adaptation = makeAdaptation();

    expect(toCardView(adaptation, AdaptationCardState.Queued, (weekday) => weekday)).toEqual({
      id: adaptation.id,
      state: AdaptationCardState.Queued,
      change: { key: 'adaptation.change.move-session', params: { from: 'thu', to: 'fri' } },
      reason: { key: 'adaptation.reason.unplanned-activity', params: adaptation.params },
    });
  });
});
