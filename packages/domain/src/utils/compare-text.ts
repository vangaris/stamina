/** Plain code-unit order, the same on every machine and in the database's "C" collation (ids are ASCII). */
export function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
