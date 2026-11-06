<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { Sheet } from '@stamina/ui-sheet';
import { useI18n } from 'vue-i18n';
import type { SwapSheetEmits, SwapSheetProps } from '../types.ts';

defineProps<SwapSheetProps>();
const emit = defineEmits<SwapSheetEmits>();

const open = defineModel<boolean>('open', { required: true });

const { t } = useI18n();
</script>

<template>
  <Sheet
    v-model:open="open"
    :title="t('session.swap.title')"
    :close-label="t('session.swap.close')"
  >
    <div class="flex flex-col gap-3 pb-4">
      <template v-if="options.length > 0">
        <p class="text-base text-text">{{ t('session.swap.intro') }}</p>
        <Button
          v-for="option in options"
          :key="option.exerciseId"
          block
          :variant="ButtonVariant.Secondary"
          data-testid="swap-option"
          @click="emit('choose', option)"
        >
          {{ t(`session.swap.${option.kind}`, { name: option.name }) }}
        </Button>
      </template>
      <p v-else class="text-base text-text">{{ t('session.swap.none') }}</p>
    </div>
  </Sheet>
</template>
