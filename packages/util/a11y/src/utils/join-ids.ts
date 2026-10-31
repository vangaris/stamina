/**
 * Space-separated id list for `aria-describedby` / `aria-labelledby`, or `undefined` when there is
 * nothing to reference (an empty attribute would be an invalid reference). Absent parts, empty
 * strings and `false` (the result of `condition && id`) are skipped; order is kept.
 */
export function joinIds(
  ...parts: readonly (string | false | null | undefined)[]
): string | undefined {
  const ids = parts.filter((part): part is string => typeof part === 'string' && part !== '');
  return ids.length > 0 ? ids.join(' ') : undefined;
}
