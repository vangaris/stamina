<script setup lang="ts">
import { Card, CardElement } from '@stamina/ui-card';
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';
import type { MealDayListEmits, MealDayListProps } from '../types.ts';
import { MealScope } from '../enums/meal-scope.ts';
import MealButtons from './MealButtons.vue';

defineProps<MealDayListProps>();
const emit = defineEmits<MealDayListEmits>();

const { t } = useI18n();
const headingId = useId();
</script>

<template>
  <Card :as="CardElement.Section" :labelled-by="headingId" data-testid="meal-day">
    <div class="flex flex-col gap-3">
      <h2 :id="headingId" class="text-base font-semibold">{{ t('meals.meal.day.title') }}</h2>
      <ul class="flex flex-col gap-4">
        <li
          v-for="meal in meals"
          :key="meal.index"
          class="flex flex-col gap-2"
          :data-testid="`meal-day-${meal.index}`"
          :data-status="meal.status ?? 'open'"
        >
          <p class="text-sm text-text-muted">
            {{
              t('meals.meal.slotAt', { slot: t(`today.meal.slot.${meal.slot}`), time: meal.time })
            }}
          </p>
          <p
            v-if="meal.title"
            class="text-base font-semibold text-text"
            data-testid="meal-day-title"
          >
            {{ meal.title }}
          </p>
          <p v-else class="text-base text-text">{{ t('meals.meal.noIdea') }}</p>
          <p v-if="meal.status" class="text-sm text-text-muted" data-testid="meal-day-status">
            {{ t('meals.meal.logged', { status: t(`meals.meal.status.${meal.status}`) }) }}
          </p>
          <MealButtons
            :meal="meal"
            :scope="MealScope.MealDay"
            @log="(index, status) => emit('log', index, status)"
          />
        </li>
      </ul>
    </div>
  </Card>
</template>
