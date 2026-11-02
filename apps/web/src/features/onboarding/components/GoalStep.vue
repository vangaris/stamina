<script setup lang="ts">
import { Goal } from '@stamina/domain';
import { ChipGroup } from '@stamina/ui-chip-group';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { StepEmits, StepProps } from '../types.ts';
import { pickedOne } from '../utils/picked-one.ts';
import { toOptions } from '../utils/to-options.ts';
import FieldError from './FieldError.vue';
import StepFrame from './StepFrame.vue';

const props = defineProps<StepProps>();
const emit = defineEmits<StepEmits>();

const { t } = useI18n();
const error = computed(() => (props.errors.goal ? t(props.errors.goal) : undefined));
const GOALS = Object.values(Goal);
const goalOptions = computed(() =>
  toOptions(GOALS, (goal) => t(`onboarding.goal.options.${goal}`)),
);
</script>

<template>
  <StepFrame
    :title="t('onboarding.goal.title')"
    :step-number="stepNumber"
    :step-count="stepCount"
    :busy="busy"
    :error-key="errorKey"
    @next="emit('next')"
    @back="emit('back')"
  >
    <div class="flex flex-col gap-2">
      <ChipGroup
        :model-value="draft.goal ?? null"
        :options="goalOptions"
        :label="t('onboarding.goal.label')"
        @update:model-value="emit('update', { field: 'goal', value: pickedOne($event, GOALS) })"
      />
      <FieldError :message="error" />
    </div>
  </StepFrame>
</template>
