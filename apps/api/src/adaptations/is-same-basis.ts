import type { SessionRevisionRef } from '@stamina/domain';

const key = ({ sessionId, revision }: SessionRevisionRef) => `${sessionId}:${revision}`;

/** The two lists name the same Session revisions, in any order. */
export function isSameBasis(
  a: readonly SessionRevisionRef[],
  b: readonly SessionRevisionRef[],
): boolean {
  const left = new Set(a.map(key));
  const right = new Set(b.map(key));
  return left.size === right.size && [...left].every((entry) => right.has(entry));
}
