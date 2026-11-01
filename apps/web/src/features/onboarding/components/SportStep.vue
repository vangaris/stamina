<script setup lang="ts">
import { SportKind } from '@stamina/contracts';
import {
  Intensity,
  LaunchSport,
  MAX_PLAY_MINUTES,
  MIN_PLAY_MINUTES,
  OTHER_SPORT_NAME_MAX_LENGTH,
  type Weekday,
} from '@stamina/domain';
import { Checkbox } from '@stamina/ui-checkbox';
import { ChipGroup } from '@stamina/ui-chip-group';
import { Stepper } from '@stamina/ui-stepper';
import { TextField } from '@stamina/ui-text-field';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { PLAY_MINUTES_STEP, WEEKDAYS } from '../config.ts';
import type { OnboardingDraft, StepEmits, StepProps } from '../types.ts';
import { pickedMany, pickedOne } from '../utils/picked-value.ts';
import { toOptions } from '../utils/to-options.ts';
import FieldError from './FieldError.vue';
import StepFrame from './StepFrame.vue';

const props = defineProps<StepProps>();
const emit = defineEmits<StepEmits>();

const { t } = useI18n();
const message = (field: keyof OnboardingDraft) => {
  const key = props.errors[field];
  return key ? t(key) : undefined;
};

const sportOptions = computed(() =>
  toOptions([...Object.values(LaunchSport), SportKind.Other], (sport) =>
    t(`onboarding.sport.sport.options.${sport}`),
  ),
);
const weekdayOptions = computed(() =>
  toOptions(WEEKDAYS, (day) => t(`onboarding.weekdays.${day}`)),
);
const intensityOptions = computed(() =>
  toOptions(Object.values(Intensity), (intensity) =>
    t(`onboarding.sport.intensity.options.${intensity}`),
  ),
);
</script>

<template>
  <StepFrame
    :title="t('onboarding.sport.title')"
    :step-number="stepNumber"
    :step-count="stepCount"
    :busy="busy"
    :error-key="errorKey"
    @next="emit('next')"
    @back="emit('back')"
  >
    <div class="flex flex-col gap-2">
      <ChipGroup
        :model-value="draft.sport ?? null"
        :options="sportOptions"
        :label="t('onboarding.sport.sport.label')"
        @update:model-value="
          emit('update', {
            field: 'sport',
            value: pickedOne<LaunchSport | SportKind.Other>($event),
          })
        "
      />
      <FieldError :message="message('sport')" />
    </div>
    <TextField
      v-if="draft.sport === SportKind.Other"
      :model-value="draft.otherSportName"
      :label="t('onboarding.sport.otherName.label')"
      :hint="t('onboarding.sport.otherName.hint')"
      :error="message('otherSportName')"
      :maxlength="OTHER_SPORT_NAME_MAX_LENGTH"
      required
      @update:model-value="emit('update', { field: 'otherSportName', value: $event })"
    />
    <div class="flex flex-col gap-2">
      <ChipGroup
        :model-value="draft.playDays"
        :options="weekdayOptions"
        :label="t('onboarding.sport.playDays.label')"
        multiple
        @update:model-value="
          emit('update', { field: 'playDays', value: pickedMany<Weekday>($event) })
        "
      />
      <Checkbox
        :model-value="draft.playVaries"
        @update:model-value="emit('update', { field: 'playVaries', value: $event })"
      >
        {{ t('onboarding.sport.playDays.varies') }}
      </Checkbox>
      <FieldError :message="message('playDays')" />
    </div>
    <Stepper
      :model-value="draft.playMinutes"
      :label="t('onboarding.sport.playMinutes.label')"
      :decrement-label="t('onboarding.sport.playMinutes.decrease')"
      :increment-label="t('onboarding.sport.playMinutes.increase')"
      :min="MIN_PLAY_MINUTES"
      :max="MAX_PLAY_MINUTES"
      :step="PLAY_MINUTES_STEP"
      :unit="t('onboarding.sport.playMinutes.unit')"
      @update:model-value="emit('update', { field: 'playMinutes', value: $event })"
    />
    <div class="flex flex-col gap-2">
      <ChipGroup
        :model-value="draft.playIntensity ?? null"
        :options="intensityOptions"
        :label="t('onboarding.sport.intensity.label')"
        @update:model-value="
          emit('update', { field: 'playIntensity', value: pickedOne<Intensity>($event) })
        "
      />
      <FieldError :message="message('playIntensity')" />
    </div>
    <p class="text-sm text-text-muted">{{ t('onboarding.sport.hotConditions') }}</p>
  </StepFrame>
</template>
