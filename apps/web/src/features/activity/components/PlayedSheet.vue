<script setup lang="ts">
import { MAX_PLAY_MINUTES, MIN_PLAY_MINUTES, type Intensity } from '@stamina/domain';
import { Button, ButtonVariant } from '@stamina/ui-button';
import { Checkbox } from '@stamina/ui-checkbox';
import { ChipGroup } from '@stamina/ui-chip-group';
import { Select } from '@stamina/ui-select';
import { Sheet } from '@stamina/ui-sheet';
import { Stepper } from '@stamina/ui-stepper';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { pickedOne, toOptions } from '../../onboarding/index.ts';
import { INTENSITIES, MINUTES_STEP, SPORT_CHOICES } from '../config.ts';
import type { PlayedSheetEmits, PlayedSheetProps, SportChoice } from '../types.ts';

defineProps<PlayedSheetProps>();
const emit = defineEmits<PlayedSheetEmits>();

const open = defineModel<boolean>('open', { required: true });
const sport = defineModel<SportChoice>('sport', { required: true });
const minutes = defineModel<number>('minutes', { required: true });
const intensity = defineModel<Intensity>('intensity', { required: true });
const hot = defineModel<boolean>('hot', { required: true });

const { t } = useI18n();
const intensityOptions = computed(() =>
  toOptions(INTENSITIES, (value) => t(`activity.played.effort.options.${value}`)),
);
</script>

<template>
  <Sheet
    v-model:open="open"
    :title="t('activity.played.title')"
    :close-label="t('activity.played.close')"
  >
    <div class="flex flex-col gap-4 pb-4" data-testid="played-sheet">
      <Select
        :model-value="sport"
        :label="t('activity.played.sport.label')"
        :placeholder="t('activity.played.sport.placeholder')"
        :options="sportOptions"
        @update:model-value="sport = pickedOne($event, SPORT_CHOICES) ?? sport"
      />
      <Stepper
        v-model="minutes"
        :label="t('activity.played.minutes.label')"
        :decrement-label="t('activity.played.minutes.decrease')"
        :increment-label="t('activity.played.minutes.increase')"
        :unit="t('activity.played.minutes.unit', { count: minutes })"
        :min="MIN_PLAY_MINUTES"
        :max="MAX_PLAY_MINUTES"
        :step="MINUTES_STEP"
      />
      <ChipGroup
        :model-value="intensity"
        :options="intensityOptions"
        :label="t('activity.played.effort.label')"
        @update:model-value="intensity = pickedOne($event, INTENSITIES) ?? intensity"
      />
      <Checkbox v-model="hot">{{ t('activity.played.hot') }}</Checkbox>
      <p class="text-lg font-semibold tabular-nums text-text" data-testid="played-load">
        {{
          t('activity.played.load', {
            minutes: preview.minutes,
            rpe: preview.rpe,
            load: preview.load,
          })
        }}
      </p>
      <p v-if="errorKey" role="alert" class="text-sm text-danger" data-testid="played-error">
        {{ t(errorKey) }}
      </p>
    </div>
    <template #footer>
      <Button :disabled="saving" data-testid="played-save" @click="emit('save')">
        {{ t('activity.played.save') }}
      </Button>
      <Button :variant="ButtonVariant.Secondary" @click="open = false">
        {{ t('activity.played.cancel') }}
      </Button>
    </template>
  </Sheet>
</template>
