<script setup lang="ts">
import { SESSION_LENGTHS_MINUTES } from '@stamina/domain';
import { ChipGroup } from '@stamina/ui-chip-group';
import { Stepper } from '@stamina/ui-stepper';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { SESSIONS_PER_WEEK_RANGE, WEEKDAYS } from '../config.ts';
import { useFieldMessages } from '../composables/useFieldMessages.ts';
import { useWeekdayOptions } from '../composables/useWeekdayOptions.ts';
import type { StepEmits, StepProps } from '../types.ts';
import { pickedMany } from '../utils/picked-many.ts';
import { pickedOne } from '../utils/picked-one.ts';
import { toOptions } from '../utils/to-options.ts';
import FieldError from './FieldError.vue';
import StepFrame from './StepFrame.vue';

const props = defineProps<StepProps>();
const emit = defineEmits<StepEmits>();

const { t } = useI18n();
const message = useFieldMessages(
  () => props.errors,
  () => ({ ...SESSIONS_PER_WEEK_RANGE, count: props.draft.sessionsPerWeek }),
);
const weekdayOptions = useWeekdayOptions();

const lengthOptions = computed(() =>
  toOptions(SESSION_LENGTHS_MINUTES, (minutes) =>
    t('onboarding.week.sessionMinutes.option', { minutes }),
  ),
);
</script>

<template>
  <StepFrame
    :title="t('onboarding.week.title')"
    :step-number="stepNumber"
    :step-count="stepCount"
    :busy="busy"
    :error-key="errorKey"
    @next="emit('next')"
    @back="emit('back')"
  >
    <div class="flex flex-col gap-2">
      <Stepper
        :model-value="draft.sessionsPerWeek"
        :label="t('onboarding.week.sessionsPerWeek.label')"
        :decrement-label="t('onboarding.week.sessionsPerWeek.decrease')"
        :increment-label="t('onboarding.week.sessionsPerWeek.increase')"
        :min="SESSIONS_PER_WEEK_RANGE.min"
        :max="SESSIONS_PER_WEEK_RANGE.max"
        @update:model-value="emit('update', { field: 'sessionsPerWeek', value: $event })"
      />
      <FieldError :message="message('sessionsPerWeek')" />
    </div>
    <div class="flex flex-col gap-2">
      <ChipGroup
        :model-value="draft.sessionMinutes ?? null"
        :options="lengthOptions"
        :label="t('onboarding.week.sessionMinutes.label')"
        @update:model-value="
          emit('update', {
            field: 'sessionMinutes',
            value: pickedOne($event, SESSION_LENGTHS_MINUTES),
          })
        "
      />
      <FieldError :message="message('sessionMinutes')" />
    </div>
    <div class="flex flex-col gap-2">
      <ChipGroup
        :model-value="draft.availableDays"
        :options="weekdayOptions"
        :label="t('onboarding.week.availableDays.label')"
        multiple
        @update:model-value="
          emit('update', { field: 'availableDays', value: pickedMany($event, WEEKDAYS) })
        "
      />
      <FieldError :message="message('availableDays')" />
    </div>
  </StepFrame>
</template>
