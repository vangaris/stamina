/** Clamps `n` to `[min, max]`; an omitted bound leaves that side open. */
export function clampToRange(n: number, min?: number, max?: number): number {
  const low = min === undefined ? n : Math.max(min, n);
  return max === undefined ? low : Math.min(max, low);
}
