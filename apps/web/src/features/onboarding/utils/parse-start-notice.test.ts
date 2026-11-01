import { describe, expect, it } from 'vitest';
import { StartNotice } from '../enums/start-notice.ts';
import { parseStartNotice } from './parse-start-notice.ts';

describe('parseStartNotice', () => {
  it('reads a known notice', () => {
    expect(parseStartNotice('invite-rejected')).toBe(StartNotice.InviteRejected);
  });

  it.each([[undefined], [null], ['whatever'], [['invite-rejected']], [42]])(
    'ignores %j',
    (value) => {
      expect(parseStartNotice(value)).toBeUndefined();
    },
  );
});
