<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { useI18n } from 'vue-i18n';
import { BODY_AREAS } from '../../safety/index.ts';
import type { StopFlagAreaPickerEmits } from '../types.ts';

const emit = defineEmits<StopFlagAreaPickerEmits>();

const { t } = useI18n();
</script>

<template>
  <ul
    class="flex flex-col gap-2 pb-4"
    :aria-label="t('stopFlag.area.label')"
    data-testid="stop-areas"
  >
    <li v-for="area in BODY_AREAS" :key="area">
      <Button
        :variant="ButtonVariant.Secondary"
        block
        :data-testid="`stop-area-${area}`"
        @click="emit('pick', area)"
      >
        {{ t(`screening.bodyAreas.options.${area}`) }}
      </Button>
    </li>
  </ul>
</template>
