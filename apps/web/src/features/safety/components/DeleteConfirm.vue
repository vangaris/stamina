<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { FieldError } from '../../onboarding/index.ts';
import type { DeleteConfirmEmits, DeleteConfirmProps } from '../types.ts';
import ScreenFrame from './ScreenFrame.vue';

const props = defineProps<DeleteConfirmProps>();
const emit = defineEmits<DeleteConfirmEmits>();

const { t } = useI18n();
const error = computed(() => (props.errorKey ? t(props.errorKey) : undefined));
</script>

<template>
  <ScreenFrame :title="t('referred.deleteConfirm.title')">
    <p class="text-base text-text">{{ t('referred.deleteConfirm.body') }}</p>
    <FieldError :message="error" />
    <div class="flex flex-col gap-2">
      <Button :variant="ButtonVariant.Danger" :disabled="busy" block @click="emit('confirm')">
        {{ t('referred.deleteConfirm.confirm') }}
      </Button>
      <Button :variant="ButtonVariant.Secondary" :disabled="busy" block @click="emit('cancel')">
        {{ t('referred.deleteConfirm.cancel') }}
      </Button>
    </div>
  </ScreenFrame>
</template>
