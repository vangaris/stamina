import type { ProgramSession } from '@stamina/contracts';
import { Weekday } from '@stamina/domain';
import { buildFakeProgram } from '../utils/build-fake-program.ts';

const [first] = buildFakeProgram({
  sessionsPerWeek: 3,
  sessionMinutes: 45,
  availableDays: [Weekday.Mon, Weekday.Wed, Weekday.Fri],
  limited: false,
  now: new Date('2026-11-06T09:00:00Z'),
}).sessions;
if (!first) throw new Error('the fake program has no Session');

/** The first Session of a small fake week (45 minutes), for tests of code that reads a Session. */
export const testFakeSession: ProgramSession = first;
