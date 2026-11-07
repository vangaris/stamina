<script setup lang="ts">
import { RATE_CHECK_LOSS_PCT } from '@stamina/domain';
import { Card, CardElement } from '@stamina/ui-card';
import { computed, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { MacroKey } from '../enums/macro-key.ts';
import type { TargetsCardProps } from '../types.ts';
import { formatNumber } from '../utils/format-number.ts';

const props = defineProps<TargetsCardProps>();

const { t } = useI18n();
const headingId = useId();
const targets = computed(() => props.nutrition.targets);
const n = (value: number) => formatNumber(value, props.locale);
const macros = computed(() => [
  { key: MacroKey.Protein, grams: targets.value.proteinG },
  { key: MacroKey.Carbs, grams: targets.value.carbsG },
  { key: MacroKey.Fat, grams: targets.value.fatG },
]);
</script>

<template>
  <Card :as="CardElement.Section" :labelled-by="headingId" data-testid="targets">
    <div class="flex flex-col gap-3">
      <div class="flex flex-col gap-1">
        <h2 :id="headingId" class="text-base font-semibold">
          {{ t('meals.targets.title') }}
        </h2>
        <p class="text-sm text-text-muted" data-testid="day-type">
          {{ t(`meals.dayType.${targets.dayType}`) }}
        </p>
      </div>
      <p class="text-2xl font-semibold tabular-nums text-text" data-testid="targets-energy">
        {{ t('meals.targets.energy', { kcal: n(targets.energyKcal) }) }}
      </p>
      <ul class="flex flex-col gap-1">
        <li
          v-for="macro in macros"
          :key="macro.key"
          class="text-base text-text"
          :data-testid="`targets-${macro.key}`"
        >
          {{ t(`meals.targets.${macro.key}`, { grams: n(macro.grams) }) }}
        </li>
      </ul>
      <p v-if="targets.gainKcal > 0" class="text-sm text-text-muted">
        {{ t('meals.targets.gain', { kcal: n(targets.gainKcal) }) }}
      </p>
      <p v-if="targets.deficitKcal < 0" class="text-sm text-text-muted">
        {{ t('meals.targets.deficit', { kcal: n(-targets.deficitKcal) }) }}
      </p>
      <p v-if="targets.floorApplied" class="text-sm text-text-muted" data-testid="targets-floor">
        {{ t('meals.targets.floor', { kcal: n(targets.restingKcal) }) }}
      </p>
      <p v-if="nutrition.rateCheck.deficitHalved" class="text-sm text-text" data-testid="rate-halved">
        {{ t('meals.rateCheck.halved', { percent: RATE_CHECK_LOSS_PCT }) }}
      </p>
    </div>
  </Card>
</template>
