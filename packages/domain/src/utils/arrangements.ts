/** Every distinct order of `items` (repeated values are not told apart), in a fixed order. */
export function arrangements<T>(items: readonly T[]): T[][] {
  if (items.length === 0) return [[]];
  const result: T[][] = [];
  const seen = new Set<T>();
  items.forEach((item, index) => {
    if (seen.has(item)) return;
    seen.add(item);
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const tail of arrangements(rest)) result.push([item, ...tail]);
  });
  return result;
}
