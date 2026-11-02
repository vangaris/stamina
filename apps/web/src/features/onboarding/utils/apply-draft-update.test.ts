import { Need, Weekday } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { applyDraftUpdate } from './apply-draft-update.ts';
import { createDraft } from './create-draft.ts';

const draft = createDraft(['en-GB']);

describe('applyDraftUpdate', () => {
  it('changes one answer and leaves the others and the original alone', () => {
    const next = applyDraftUpdate(draft, { field: 'needs', value: Need.Both });

    expect(next).toEqual({ ...draft, needs: Need.Both });
    expect(draft.needs).toBeUndefined();
  });

  it('keeps only digits of the birth year', () => {
    expect(applyDraftUpdate(draft, { field: 'birthYear', value: '19a9 0' }).birthYear).toBe('1990');
  });

  it('turns "It varies" off when play days are picked', () => {
    const varies = applyDraftUpdate(draft, { field: 'playVaries', value: true });

    expect(applyDraftUpdate(varies, { field: 'playDays', value: [Weekday.Sat] })).toMatchObject({
      playVaries: false,
      playDays: [Weekday.Sat],
    });
  });

  it('clears the play days when "It varies" is turned on, but not when it is turned off', () => {
    const days = applyDraftUpdate(draft, { field: 'playDays', value: [Weekday.Tue, Weekday.Sat] });

    const varies = applyDraftUpdate(days, { field: 'playVaries', value: true });
    expect(varies).toMatchObject({ playVaries: true, playDays: [] });

    expect(applyDraftUpdate(days, { field: 'playVaries', value: false }).playDays).toEqual([
      Weekday.Tue,
      Weekday.Sat,
    ]);
  });

  it('keeps "It varies" when the days are emptied again', () => {
    const varies = applyDraftUpdate(draft, { field: 'playVaries', value: true });

    expect(applyDraftUpdate(varies, { field: 'playDays', value: [] }).playVaries).toBe(true);
  });
});
