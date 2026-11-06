/** The share of results whose first answer passed; 0 for no results. */
export function passRate(results: readonly { failure: unknown }[]): number {
  return results.length === 0
    ? 0
    : results.filter(({ failure }) => failure === null).length / results.length;
}
