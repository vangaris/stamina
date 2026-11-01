<script setup lang="ts">
import { AriaRole } from '@stamina/a11y';
import { Chip, ChipMode } from '@stamina/ui-chip';
import { RovingKeys, rovingTabStop, rovingTarget } from '@stamina/roving-focus';
import { computed, useId, useTemplateRef } from 'vue';
import type { ChipGroupModel, ChipGroupOption, ChipGroupProps, ChipGroupValue } from '../types.ts';
import { isChipSelected } from '../utils/is-chip-selected.ts';
import { toggleChipValue } from '../utils/toggle-chip-value.ts';

const props = withDefaults(defineProps<ChipGroupProps>(), {
  labelHidden: false,
  multiple: false,
  allowDeselect: false,
});

/** Single: the value or `null`. Multiple: the array of selected values. */
const model = defineModel<ChipGroupModel>({ default: null });

const labelId = useId();
const group = useTemplateRef<HTMLElement>('group');

const isSelected = (value: ChipGroupValue) => isChipSelected(model.value, value);

const disabledFlags = computed(() => props.options.map((o) => o.disabled === true));

/** Single mode: the one chip in the tab order. */
const tabbableValue = computed<ChipGroupValue | undefined>(() => {
  const selected = props.options.findIndex((o) => isSelected(o.value));
  return props.options[rovingTabStop(disabledFlags.value, selected) ?? -1]?.value;
});

function toggle(option: ChipGroupOption) {
  if (option.disabled) return;
  model.value = toggleChipValue(model.value, option.value, {
    multiple: props.multiple,
    allowDeselect: props.allowDeselect,
  });
}

function onKeydown(event: KeyboardEvent) {
  if (props.multiple || event.altKey || event.ctrlKey || event.metaKey) return;
  // Chips render in option order, so a chip's position is its option's index.
  const chips = Array.from(group.value?.querySelectorAll<HTMLElement>('[role="radio"]') ?? []);
  const current = chips.indexOf(event.target as HTMLElement);
  if (current === -1) return;
  const next = rovingTarget(disabledFlags.value, current, event.key, RovingKeys.Both);
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
      :role="multiple ? AriaRole.Group : AriaRole.Radiogroup"
      :aria-labelledby="labelId"
      class="flex flex-wrap gap-2"
      @keydown="onKeydown"
    >
      <Chip
        v-for="option in options"
        :key="option.value"
        :mode="multiple ? ChipMode.Check : ChipMode.Radio"
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
