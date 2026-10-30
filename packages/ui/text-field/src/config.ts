/**
 * Attributes the wrapper `<div>` keeps, so they never reach the `<input>`.
 * `id` and `aria-describedby` are not forwarded as-is: they are merged into the input's own.
 */
export const WRAPPER_ATTR_KEYS = ['class', 'style'] as const;
export const MERGED_ATTR_KEYS = ['id', 'aria-describedby'] as const;
