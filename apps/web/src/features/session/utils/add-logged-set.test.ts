import { describe, expect, it } from 'vitest';
import { makeLoggedSet, makeSessionDetail } from '../testing/make-session-detail.ts';
import { addLoggedSet } from './add-logged-set.ts';

describe('addLoggedSet', () => {
  it('adds the set to its exercise in set order and leaves the input alone', () => {
    const detail = makeSessionDetail();
    const main = detail.exercises[1]!;
    const first = makeLoggedSet({ setNumber: 1 });
    const second = makeLoggedSet({ setNumber: 2 });
    const withSecond = addLoggedSet(detail, main.id, second);

    const updated = addLoggedSet(withSecond, main.id, first);

    expect(updated.exercises[1]?.loggedSets).toEqual([first, second]);
    expect(updated.exercises[0]?.loggedSets).toEqual([]);
    expect(detail.exercises[1]?.loggedSets).toEqual([]);
  });
});
