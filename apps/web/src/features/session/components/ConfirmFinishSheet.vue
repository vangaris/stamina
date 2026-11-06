<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { Sheet } from '@stamina/ui-sheet';
import { useI18n } from 'vue-i18n';
import type { ConfirmFinishSheetEmits, ConfirmFinishSheetProps } from '../types.ts';

defineProps<ConfirmFinishSheetProps>();
const emit = defineEmits<ConfirmFinishSheetEmits>();

const open = defineModel<boolean>('open', { required: true });

const { t } = useI18n();
</script>

<template>
  <Sheet
    v-model:open="open"
    :title="t('session.confirmFinish.title')"
    :close-label="t('session.confirmFinish.close')"
  >
    <p class="pb-4 text-base text-text">{{ t('session.confirmFinish.body', { left }) }}</p>
    <template #footer>
      <Button data-testid="confirm-finish" @click="emit('confirm')">
        {{ t('session.confirmFinish.confirm') }}
      </Button>
      <Button :variant="ButtonVariant.Secondary" @click="open = false">
        {{ t('session.confirmFinish.cancel') }}
      </Button>
    </template>
  </Sheet>
</template>
