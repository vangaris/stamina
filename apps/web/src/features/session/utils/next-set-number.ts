import type { LogSet } from '@stamina/contracts';

/** The number of the next set to log: one more than the highest logged, 1 for the first. */
export function nextSetNumber(loggedSets: readonly Pick<LogSet, 'setNumber'>[]): number {
  return loggedSets.reduce((highest, { setNumber }) => Math.max(highest, setNumber), 0) + 1;
}
