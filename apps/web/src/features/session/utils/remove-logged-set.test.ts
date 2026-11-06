import { describe, expect, it } from 'vitest';
import { makeLoggedSet, makeSessionDetail } from '../testing/make-session-detail.ts';
import { addLoggedSet } from './add-logged-set.ts';
import { removeLoggedSet } from './remove-logged-set.ts';

describe('removeLoggedSet', () => {
  it('removes just the set with that id', () => {
    const base = makeSessionDetail();
    const main = base.exercises[1]!;
    const keep = makeLoggedSet({ setNumber: 1 });
    const drop = makeLoggedSet({ setNumber: 2 });
    const detail = addLoggedSet(addLoggedSet(base, main.id, keep), main.id, drop);

    expect(removeLoggedSet(detail, drop.id).exercises[1]?.loggedSets).toEqual([keep]);
  });

  it('changes nothing for an unknown id', () => {
    const detail = makeSessionDetail();

    expect(removeLoggedSet(detail, 'unknown')).toEqual(detail);
  });
});
