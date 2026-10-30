<script setup lang="ts">
import { Chip } from '@stamina/ui-chip';
import { rovingTabStop, rovingTarget } from '@stamina/roving-focus';
import { computed, useId, useTemplateRef } from 'vue';

export type ChipGroupValue = string | number;
export interface ChipGroupOption {
  value: ChipGroupValue;
  label: string;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    options: ChipGroupOption[];
    /** The group's accessible name; shown as a visible label unless `labelHidden`. */
    label: string;
    labelHidden?: boolean;
    /** Several chips can be on (checkbox chips). Otherwise exactly one (radio chips). */
    multiple?: boolean;
    /** Single mode only: clicking the selected chip clears the selection. */
    allowDeselect?: boolean;
  }>(),
  { labelHidden: false, multiple: false, allowDeselect: false },
);

/** Single: the value or `null`. Multiple: the array of selected values. */
const model = defineModel<ChipGroupValue | null | ChipGroupValue[]>({ default: null });

const labelId = useId();
const group = useTemplateRef<HTMLElement>('group');

function isSelected(value: ChipGroupValue): boolean {
  return Array.isArray(model.value) ? model.value.includes(value) : model.value === value;
}

const disabledFlags = computed(() => props.options.map((o) => o.disabled === true));

/** Single mode: the one chip in the tab order. */
const tabbableValue = computed<ChipGroupValue | undefined>(() => {
  const selected = props.options.findIndex((o) => isSelected(o.value));
  return props.options[rovingTabStop(disabledFlags.value, selected) ?? -1]?.value;
});

function toggle(option: ChipGroupOption) {
  if (option.disabled) return;
  if (props.multiple) {
    const current = Array.isArray(model.value) ? model.value : [];
    model.value = current.includes(option.value)
      ? current.filter((v) => v !== option.value)
      : [...current, option.value];
  } else if (isSelected(option.value)) {
    if (props.allowDeselect) model.value = null;
  } else {
    model.value = option.value;
  }
}

function onKeydown(event: KeyboardEvent) {
  if (props.multiple || event.altKey || event.ctrlKey || event.metaKey) return;
  // Chips render in option order, so a chip's position is its option's index.
  const chips = Array.from(group.value?.querySelectorAll<HTMLElement>('[role="radio"]') ?? []);
  const current = chips.indexOf(event.target as HTMLElement);
  if (current === -1) return;
  const next = rovingTarget(disabledFlags.value, current, event.key, 'both');
  const option = next === undefined ? undefined : props.options[next];
  if (!option) return;
  event.preventDefault();
  model.value = option.value;
  chips[next!]?.focus();
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <span :id="labelId" :class="labelHidden ? 'sr-only' : 'text-sm font-medium text-text'">{{
      label
    }}</span>
    <div
      ref="group"
      :role="multiple ? 'group' : 'radiogroup'"
      :aria-labelledby="labelId"
      class="flex flex-wrap gap-2"
      @keydown="onKeydown"
    >
      <Chip
        v-for="option in options"
        :key="option.value"
        :mode="multiple ? 'check' : 'radio'"
        :selected="isSelected(option.value)"
        :disabled="option.disabled ?? false"
        :tabindex="multiple || option.value === tabbableValue ? 0 : -1"
        @click="toggle(option)"
      >
        {{ option.label }}
      </Chip>
    </div>
  </div>
</template>
