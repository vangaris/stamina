<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { FieldError } from '../../onboarding/index.ts';
import type { ReferredViewEmits, ReferredViewProps } from '../types.ts';
import ScreenFrame from './ScreenFrame.vue';

const props = defineProps<ReferredViewProps>();
const emit = defineEmits<ReferredViewEmits>();

const { t } = useI18n();
const error = computed(() => (props.errorKey ? t(props.errorKey) : undefined));
</script>

<template>
  <ScreenFrame :title="t('referred.title')">
    <p class="text-base text-text">
      {{ t(isPregnancy ? 'referred.body.pregnancy' : 'referred.body.general') }}
    </p>
    <p class="text-base text-text-muted">{{ t('referred.yourData') }}</p>
    <div v-if="!isPregnancy" class="flex flex-col gap-2">
      <Button :disabled="busy" block @click="emit('doctor-ok')">
        {{ t('referred.actions.doctorOk') }}
      </Button>
      <p class="text-sm text-text-muted">{{ t('referred.doctorOkHint') }}</p>
    </div>
    <p v-if="exported" role="status" class="text-sm font-medium text-text">
      {{ t('referred.exported') }}
    </p>
    <FieldError :message="error" />
    <div class="flex flex-col gap-2">
      <Button :variant="ButtonVariant.Secondary" :disabled="busy" block @click="emit('export')">
        {{ t('referred.actions.export') }}
      </Button>
      <Button :variant="ButtonVariant.Secondary" :disabled="busy" block @click="emit('delete')">
        {{ t('referred.actions.delete') }}
      </Button>
      <Button :variant="ButtonVariant.Ghost" :disabled="busy" block @click="emit('sign-out')">
        {{ t('referred.actions.signOut') }}
      </Button>
    </div>
  </ScreenFrame>
</template>
