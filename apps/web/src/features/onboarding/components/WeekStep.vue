<script setup lang="ts">
import { SESSION_LENGTHS_MINUTES, type Weekday } from '@stamina/domain';
import { ChipGroup } from '@stamina/ui-chip-group';
import { Stepper } from '@stamina/ui-stepper';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { SESSIONS_PER_WEEK_RANGE, WEEKDAYS } from '../config.ts';
import type { OnboardingDraft, StepEmits, StepProps } from '../types.ts';
import { pickedMany, pickedNumber } from '../utils/picked-value.ts';
import { toOptions } from '../utils/to-options.ts';
import FieldError from './FieldError.vue';
import StepFrame from './StepFrame.vue';

const props = defineProps<StepProps>();
const emit = defineEmits<StepEmits>();

const { t } = useI18n();
const message = (field: keyof OnboardingDraft) => {
  const key = props.errors[field];
  return key
    ? t(key, { ...SESSIONS_PER_WEEK_RANGE, count: props.draft.sessionsPerWeek })
    : undefined;
};

const lengthOptions = computed(() =>
  toOptions(SESSION_LENGTHS_MINUTES, (minutes) =>
    t('onboarding.week.sessionMinutes.option', { minutes }),
  ),
);
const weekdayOptions = computed(() =>
  toOptions(WEEKDAYS, (day) => t(`onboarding.weekdays.${day}`)),
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
          emit('update', { field: 'sessionMinutes', value: pickedNumber($event) })
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
          emit('update', { field: 'availableDays', value: pickedMany<Weekday>($event) })
        "
      />
      <FieldError :message="message('availableDays')" />
    </div>
  </StepFrame>
</template>
