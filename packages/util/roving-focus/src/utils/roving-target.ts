import { Key } from '@stamina/a11y';
import { RovingKeys } from '../enums/roving-keys.ts';

/**
 * Keyboard rules for a "roving tabindex" widget (tabs, radio groups): one item is in the Tab
 * order, arrow keys move between items, disabled items are skipped. Pure index arithmetic, so
 * every component that needs it behaves the same.
 *
 * Index of the item a key moves to, or undefined when the key is not a navigation key (or every
 * item is disabled). Arrows wrap; Home/End jump to the first/last enabled item. `keys` says
 * whether Up/Down also navigate (`both`, radio groups) or only Left/Right (`horizontal`, tabs).
 * If `current` is not an enabled item, forward starts at the first and backward at the last.
 */
export function rovingTarget(
  disabled: readonly boolean[],
  current: number,
  key: string,
  keys: RovingKeys = RovingKeys.Horizontal,
): number | undefined {
  const enabled = disabled.flatMap((d, i) => (d ? [] : [i]));
  if (enabled.length === 0) return undefined;
  const position = enabled.indexOf(current);
  const forward = key === Key.ArrowRight || (keys === RovingKeys.Both && key === Key.ArrowDown);
  const backward = key === Key.ArrowLeft || (keys === RovingKeys.Both && key === Key.ArrowUp);
  if (forward) return enabled[position === -1 ? 0 : (position + 1) % enabled.length];
  if (backward) {
    return enabled[
      position === -1 ? enabled.length - 1 : (position - 1 + enabled.length) % enabled.length
    ];
  }
  if (key === Key.Home) return enabled[0];
  if (key === Key.End) return enabled[enabled.length - 1];
  return undefined;
}
