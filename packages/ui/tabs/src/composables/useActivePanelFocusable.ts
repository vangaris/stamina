import { nextTick, onMounted, ref, watch, type Ref } from 'vue';
import { ACTIVE_PANEL_SELECTOR, FOCUSABLE_SELECTOR } from '../config.ts';

/**
 * APG: a panel whose content has nothing focusable is itself reachable with Tab, so keyboard and
 * screen-reader users can get to it. Checked on mount and when `activeId` changes; not on later
 * content updates.
 */
export function useActivePanelFocusable(
  root: Readonly<Ref<HTMLElement | null>>,
  activeId: Ref<string>,
) {
  const hasFocusable = ref(false);
  async function refresh() {
    await nextTick();
    const panel = root.value?.querySelector<HTMLElement>(ACTIVE_PANEL_SELECTOR);
    hasFocusable.value = panel?.querySelector(FOCUSABLE_SELECTOR) != null;
  }
  onMounted(refresh);
  watch(activeId, refresh);
  return hasFocusable;
}
