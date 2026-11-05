/** Every way to choose `size` of `items`, each in the items' order, the lists in lexicographic order. */
export function combinations<T>(items: readonly T[], size: number): T[][] {
  if (size === 0) return [[]];
  const result: T[][] = [];
  items.forEach((item, index) => {
    for (const rest of combinations(items.slice(index + 1), size - 1)) result.push([item, ...rest]);
  });
  return result;
}
