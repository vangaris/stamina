import type { HTMLAttributes } from 'vue';
import { MERGED_ATTR_KEYS, WRAPPER_ATTR_KEYS } from '../config.ts';

export interface SplitAttrs {
  /** `class` and `style`, for the wrapper element. Keys are always present. */
  wrapper: Pick<HTMLAttributes, 'class' | 'style'>;
  /** Everything else (inputmode, maxlength, listeners, ...), for the `<input>`. */
  input: Record<string, unknown>;
}

const NOT_FOR_INPUT: ReadonlySet<string> = new Set([...WRAPPER_ATTR_KEYS, ...MERGED_ATTR_KEYS]);

/**
 * Divides fallthrough attributes between the wrapper and the input.
 * `id` and `aria-describedby` go to neither: the caller merges them into the input's own.
 */
export function splitAttrs(attrs: Readonly<Record<string, unknown>>): SplitAttrs {
  return {
    // Fallthrough attrs are `unknown`; Vue itself accepts only class/style values here.
    wrapper: {
      class: attrs.class as HTMLAttributes['class'],
      style: attrs.style as HTMLAttributes['style'],
    },
    input: Object.fromEntries(Object.entries(attrs).filter(([key]) => !NOT_FOR_INPUT.has(key))),
  };
}
