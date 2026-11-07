<script setup lang="ts">
import { Card, CardElement } from '@stamina/ui-card';
import { computed, nextTick, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { MealScope } from '../enums/meal-scope.ts';
import type { MealLogStatus } from '@stamina/domain';
import type { NextMealCardEmits, NextMealCardProps } from '../types.ts';
import { formatNumber } from '../utils/format-number.ts';
import MealButtons from './MealButtons.vue';

const props = defineProps<NextMealCardProps>();
const emit = defineEmits<NextMealCardEmits>();

const { t } = useI18n();
const headingId = useId();
const n = (value: number) => formatNumber(value, props.locale);
const headingEl = ref<HTMLElement>();
/** What was just logged, until the card moves on and says so. */
const pending = ref<{ status: MealLogStatus; name: string }>();
/** What the polite status region reads out after a log. */
const announcement = ref('');

function mealName(meal: { title: string | undefined; slot: string }): string {
  return meal.title ?? t(`today.meal.slot.${meal.slot}`);
}

function log(index: number, status: MealLogStatus) {
  if (props.meal) pending.value = { status, name: mealName(props.meal) };
  emit('log', index, status);
}

// The card moves on once the log lands: say what happened, and when the focused button is gone
// (the last meal was logged) move focus to the heading so it does not fall back to the page.
watch(
  () => props.meal?.index,
  async () => {
    const logged = pending.value;
    if (!logged) return;
    pending.value = undefined;
    const status = t(`meals.meal.status.${logged.status}`);
    announcement.value = props.meal
      ? t('meals.meal.next.announced', { status, meal: logged.name, next: mealName(props.meal) })
      : t('meals.meal.next.announcedAllLogged', { status, meal: logged.name });
    await nextTick();
    const active = document.activeElement;
    if (!active || active === document.body) headingEl.value?.focus();
  },
);

const when = computed(() =>
  props.meal
    ? t('meals.meal.slotAt', {
        slot: t(`today.meal.slot.${props.meal.slot}`),
        time: props.meal.time,
      })
    : '',
);
</script>

<template>
  <Card :as="CardElement.Section" :labelled-by="headingId" data-testid="next-meal">
    <div class="flex flex-col gap-3">
      <h2 :id="headingId" ref="headingEl" tabindex="-1" class="text-base font-semibold">
        {{ t('meals.meal.next.title') }}
      </h2>
      <p v-if="!meal" class="text-base text-text" data-testid="next-meal-done">
        {{ t('meals.meal.next.allLogged') }}
      </p>
      <template v-else>
        <p class="text-sm text-text-muted" data-testid="next-meal-when">{{ when }}</p>
        <template v-if="meal.title">
          <p class="text-lg font-semibold text-text" data-testid="next-meal-title">
            {{ meal.title }}
          </p>
          <ul class="flex flex-col gap-1 text-base text-text" data-testid="next-meal-portions">
            <li v-for="line in meal.portions" :key="line">{{ line }}</li>
          </ul>
          <p
            v-if="meal.macros"
            class="text-sm text-text-muted tabular-nums"
            data-testid="next-meal-macros"
          >
            {{
              t('meals.meal.macros', {
                kcal: n(meal.macros.kcal),
                protein: n(meal.macros.proteinG),
                carbs: n(meal.macros.carbsG),
                fat: n(meal.macros.fatG),
              })
            }}
          </p>
        </template>
        <p v-else class="text-base text-text" data-testid="next-meal-no-idea">
          {{ t('meals.meal.noIdea') }}
        </p>
        <MealButtons :meal="meal" :scope="MealScope.NextMeal" @log="log" />
      </template>
      <p role="status" aria-live="polite" class="sr-only" data-testid="next-meal-announcement">
        {{ announcement }}
      </p>
    </div>
  </Card>
</template>
