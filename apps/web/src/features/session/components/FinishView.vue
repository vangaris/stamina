<script setup lang="ts">
import { MAX_SESSION_MINUTES } from '@stamina/domain';
import { Button, ButtonVariant } from '@stamina/ui-button';
import { ChipGroup } from '@stamina/ui-chip-group';
import { Stepper } from '@stamina/ui-stepper';
import { useI18n } from 'vue-i18n';
import { useId } from 'vue';
import { pickedOne, toOptions } from '../../onboarding/index.ts';
import { FINISH_MINUTES_STEP, MIN_FINISH_MINUTES, SESSION_RPE_VALUES } from '../config.ts';
import type { FinishViewEmits, FinishViewProps } from '../types.ts';

defineProps<FinishViewProps>();
const emit = defineEmits<FinishViewEmits>();

const rpe = defineModel<number | undefined>('rpe', { required: true });
const minutes = defineModel<number>('minutes', { required: true });

const { t } = useI18n();
const titleId = useId();
const rpeOptions = toOptions(SESSION_RPE_VALUES, String);
</script>

<template>
  <section class="flex flex-col gap-4" :aria-labelledby="titleId" data-testid="finish-view">
    <h1 :id="titleId" class="text-xl font-semibold">{{ t('session.finish.title') }}</h1>
    <div class="flex flex-col gap-1">
      <ChipGroup
        :model-value="rpe ?? null"
        :options="rpeOptions"
        :label="t('session.finish.rpe.label')"
        @update:model-value="rpe = pickedOne($event, SESSION_RPE_VALUES)"
      />
      <p class="text-sm text-text-muted">{{ t('session.finish.rpe.hint') }}</p>
    </div>
    <Stepper
      v-model="minutes"
      :label="t('session.finish.minutes.label')"
      :decrement-label="t('session.finish.minutes.decrease')"
      :increment-label="t('session.finish.minutes.increase')"
      :unit="t('session.unit.minutes', { count: minutes })"
      :min="MIN_FINISH_MINUTES"
      :max="MAX_SESSION_MINUTES"
      :step="FINISH_MINUTES_STEP"
    />
    <p v-if="errorKey" role="alert" class="text-sm text-danger">{{ t(errorKey) }}</p>
    <Button
      block
      :disabled="rpe === undefined || submitting"
      data-testid="finish-submit"
      @click="emit('submit')"
    >
      {{ t('session.finish.submit') }}
    </Button>
    <Button block :variant="ButtonVariant.Secondary" @click="emit('back')">
      {{ t('session.finish.back') }}
    </Button>
  </section>
</template>
