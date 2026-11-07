import { MAX_DISLIKE_LENGTH, MAX_DISLIKES } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { addDislike } from './add-dislike.ts';

describe('addDislike', () => {
  it('adds a trimmed food at the end', () => {
    expect(addDislike(['olives'], '  liver ')).toEqual(['olives', 'liver']);
  });

  it('ignores blank text', () => {
    expect(addDislike(['olives'], '   ')).toEqual(['olives']);
  });

  it('ignores a food already there, whatever the letter case', () => {
    expect(addDislike(['Olives'], 'olives')).toEqual(['Olives']);
  });

  it('cuts a long text to the longest a dislike may be', () => {
    const [added] = addDislike([], 'x'.repeat(MAX_DISLIKE_LENGTH + 5));
    expect(added).toHaveLength(MAX_DISLIKE_LENGTH);
  });

  it('adds nothing to a full list', () => {
    const full = Array.from({ length: MAX_DISLIKES }, (_, index) => `food ${index}`);
    expect(addDislike(full, 'one more')).toEqual(full);
  });
});
