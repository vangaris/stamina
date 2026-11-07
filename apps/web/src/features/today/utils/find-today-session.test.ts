import { describe, expect, it } from 'vitest';
import { makeProgram, makeSession } from '../testing/make-program.ts';
import { findTodaySession } from './find-today-session.ts';

describe('findTodaySession', () => {
  it("finds the Session on today's date", () => {
    const today = makeSession({ id: '00000000-0000-4000-8000-000000000002', date: '2026-11-07' });
    const program = makeProgram({ sessions: [makeSession({ date: '2026-11-06' }), today] });

    expect(findTodaySession(program, '2026-11-07')).toBe(today);
  });

  it('finds nothing on a day without a Session', () => {
    expect(findTodaySession(makeProgram(), '2026-11-08')).toBeUndefined();
  });

  it('finds nothing when there is no Program', () => {
    expect(findTodaySession(null, '2026-11-06')).toBeUndefined();
  });
});
