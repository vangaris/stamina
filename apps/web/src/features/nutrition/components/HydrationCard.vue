<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { DRINKS_MAX_EXERCISE_ML_PER_HOUR } from '@stamina/domain';
import { Card, CardElement } from '@stamina/ui-card';
import { ProgressBar, ProgressBarTone } from '@stamina/ui-progress-bar';
import { computed, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { PRE_ACTIVITY_HOURS, WATER_AMOUNTS } from '../config.ts';
import type { HydrationCardEmits, HydrationCardProps } from '../types.ts';
import { formatNumber } from '../utils/format-number.ts';

const props = defineProps<HydrationCardProps>();
const emit = defineEmits<HydrationCardEmits>();

const { t } = useI18n();
const headingId = useId();
const targets = computed(() => props.nutrition.targets);
const n = (value: number) => formatNumber(value, props.locale);
const progress = computed(() =>
  t('meals.water.progress', {
    ml: n(props.nutrition.water.ml),
    target: n(props.nutrition.water.targetMl),
  }),
);
</script>

<template>
  <Card :as="CardElement.Section" :labelled-by="headingId" data-testid="hydration">
    <div class="flex flex-col gap-3">
      <h2 :id="headingId" class="text-base font-semibold">{{ t('meals.water.title') }}</h2>
      <ProgressBar
        :value="nutrition.water.ml"
        :max="nutrition.water.targetMl"
        :label="t('meals.water.title')"
        :value-text="progress"
        :tone="ProgressBarTone.Accent"
        data-testid="meals-water-bar"
      />
      <p
        role="status"
        aria-live="polite"
        class="text-base text-text tabular-nums"
        data-testid="meals-water-progress"
      >
        {{ progress }}
      </p>
      <div class="flex gap-2">
        <Button
          v-for="amount in WATER_AMOUNTS"
          :key="amount"
          :variant="ButtonVariant.Secondary"
          :aria-label="t('meals.water.addLabel', { ml: amount })"
          :data-testid="`water-add-${amount}`"
          @click="emit('log', amount)"
        >
          {{ t('meals.water.add', { ml: amount }) }}
        </Button>
      </div>
      <p v-if="failedKey" role="alert" class="text-sm text-text" data-testid="water-error">
        {{ t(failedKey) }}
      </p>
      <ul class="flex flex-col gap-1 text-sm text-text-muted">
        <li v-if="targets.drinkToThirst" data-testid="drink-to-thirst">
          {{ t('meals.water.toThirst') }}
        </li>
        <li v-if="targets.drinkCapApplied" data-testid="drink-cap">
          {{ t('meals.water.cap', { ml: n(DRINKS_MAX_EXERCISE_ML_PER_HOUR) }) }}
        </li>
        <li v-if="targets.preActivityMl" data-testid="pre-activity">
          {{
            t('meals.water.preActivity', {
              min: n(targets.preActivityMl.min),
              max: n(targets.preActivityMl.max),
              fromHours: PRE_ACTIVITY_HOURS.from,
              toHours: PRE_ACTIVITY_HOURS.to,
            })
          }}
        </li>
        <li v-if="targets.electrolyteNote" data-testid="electrolytes">
          {{ t('meals.water.electrolytes') }}
        </li>
        <li v-if="targets.duringCarbsGPerHour" data-testid="during-carbs">
          {{
            t('meals.water.duringCarbs', {
              min: n(targets.duringCarbsGPerHour.min),
              max: n(targets.duringCarbsGPerHour.max),
            })
          }}
        </li>
      </ul>
    </div>
  </Card>
</template>
