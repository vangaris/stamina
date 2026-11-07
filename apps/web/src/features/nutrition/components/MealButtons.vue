<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { MEAL_STATUS_OPTIONS } from '../config.ts';
import type { MealButtonsEmits, MealButtonsProps } from '../types.ts';

const props = defineProps<MealButtonsProps>();
const emit = defineEmits<MealButtonsEmits>();

const { t } = useI18n();
const name = computed(() => props.meal.title ?? t(`today.meal.slot.${props.meal.slot}`));
</script>

<template>
  <div
    role="group"
    :aria-label="t('meals.meal.choices', { meal: name })"
    class="flex flex-wrap gap-2"
  >
    <Button
      v-for="option in MEAL_STATUS_OPTIONS"
      :key="option"
      :variant="meal.status === option ? ButtonVariant.Primary : ButtonVariant.Secondary"
      :aria-pressed="meal.status === option"
      :aria-label="
        t('meals.meal.actionLabel', {
          action: t(`meals.meal.status.${option}`),
          meal: name,
          time: meal.time,
        })
      "
      :data-testid="`${scope}-${meal.index}-${option}`"
      @click="emit('log', meal.index, option)"
    >
      {{ t(`meals.meal.status.${option}`) }}
    </Button>
  </div>
</template>
