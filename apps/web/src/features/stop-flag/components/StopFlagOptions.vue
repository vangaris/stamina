<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { useI18n } from 'vue-i18n';
import { STOP_FLAG_OPTIONS } from '../config.ts';
import type { StopFlagOptionsEmits } from '../types.ts';

const emit = defineEmits<StopFlagOptionsEmits>();

const { t } = useI18n();
</script>

<template>
  <ul class="flex flex-col gap-2 pb-4" data-testid="stop-options">
    <li v-for="flag in STOP_FLAG_OPTIONS" :key="flag">
      <Button
        :variant="ButtonVariant.Secondary"
        block
        :data-testid="`stop-option-${flag}`"
        @click="emit('pick', flag)"
      >
        {{ t(`stopFlag.options.${flag}`) }}
      </Button>
    </li>
  </ul>
</template>
