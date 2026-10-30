<script setup lang="ts">
import { rovingTabStop, rovingTarget } from '@stamina/roving-focus';
import { computed, nextTick, onMounted, ref, useId, useTemplateRef, watch } from 'vue';

export interface TabsItem {
  /** Stable id: the `v-model` value and the name of this tab's panel slot. */
  id: string;
  label: string;
  disabled?: boolean;
}

const props = defineProps<{
  items: readonly TabsItem[];
  /** Accessible name of the tab list. */
  label: string;
}>();

/** Id of the active tab. */
const model = defineModel<string>({ required: true });

/** One panel slot per item, named by the item id: `<template #today>`. */
defineSlots<Record<string, () => unknown>>();

const uid = useId();
const tabId = (index: number) => `${uid}-tab-${index}`;
const panelId = (index: number) => `${uid}-panel-${index}`;

const root = useTemplateRef<HTMLElement>('root');
const tabs = useTemplateRef<HTMLButtonElement[]>('tabs');

const disabledFlags = computed(() => props.items.map((item) => item.disabled === true));

/** The one tab that is in the tab order: the active one, else the first enabled one. */
const tabbableId = computed(() => {
  const active = props.items.findIndex((item) => item.id === model.value);
  return props.items[rovingTabStop(disabledFlags.value, active) ?? -1]?.id;
});

function select(index: number) {
  const item = props.items[index];
  if (!item || item.disabled) return;
  model.value = item.id;
  tabs.value?.[index]?.focus();
}

function onKeydown(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const current = tabs.value?.findIndex((tab) => tab === document.activeElement) ?? -1;
  const next = rovingTarget(disabledFlags.value, current, event.key);
  if (next === undefined) return;
  event.preventDefault();
  select(next);
}

// APG: a panel whose content has nothing focusable is itself reachable with Tab, so keyboard and
// screen-reader users can get to it. Checked when the panel changes; not on later content updates.
const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"]), [contenteditable=""], [contenteditable="true"]';
const hasFocusable = ref(false);
async function refreshPanelFocusable() {
  await nextTick();
  const panel = root.value?.querySelector<HTMLElement>('[role="tabpanel"]:not([hidden])');
  hasFocusable.value = panel?.querySelector(FOCUSABLE) != null;
}
onMounted(refreshPanelFocusable);
watch(model, refreshPanelFocusable);
</script>

<template>
  <div ref="root">
    <div
      role="tablist"
      :aria-label="label"
      class="flex flex-wrap border-b border-border"
      @keydown="onKeydown"
    >
      <button
        v-for="(item, index) in items"
        :id="tabId(index)"
        ref="tabs"
        :key="item.id"
        type="button"
        role="tab"
        :aria-selected="item.id === model"
        :aria-controls="panelId(index)"
        :tabindex="item.id === tabbableId ? 0 : -1"
        :disabled="item.disabled"
        class="-mb-px min-h-tap grow cursor-pointer border-b-4 px-4 text-center text-sm transition-colors focus-ring-inset disabled:cursor-not-allowed disabled:opacity-50"
        :class="
          item.id === model
            ? 'border-accent font-semibold text-text'
            : 'border-transparent font-medium text-text-muted hover:bg-surface-sunken'
        "
        @click="select(index)"
      >
        {{ item.label }}
      </button>
    </div>
    <!-- Every tab's `aria-controls` resolves: inactive panels stay in the DOM, `hidden` and empty. -->
    <div
      v-for="(item, index) in items"
      :id="panelId(index)"
      :key="item.id"
      role="tabpanel"
      :aria-labelledby="tabId(index)"
      :hidden="item.id !== model"
      :tabindex="item.id === model && !hasFocusable ? 0 : undefined"
      class="pt-4 focus-ring"
    >
      <slot v-if="item.id === model" :name="item.id" />
    </div>
  </div>
</template>
