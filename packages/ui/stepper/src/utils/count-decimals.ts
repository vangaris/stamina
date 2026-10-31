/** Number of decimal places in the shortest string form of `n` (also for `1e-7`). */
export function countDecimals(n: number | undefined): number {
  if (n === undefined || !Number.isFinite(n)) return 0;
  const [, fraction = '', exponent = '0'] = /^-?\d*\.?(\d*)(?:e([+-]?\d+))?$/.exec(String(n)) ?? [];
  return Math.max(0, fraction.length - Number(exponent));
}
