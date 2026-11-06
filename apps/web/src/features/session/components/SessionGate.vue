<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { Card } from '@stamina/ui-card';
import { useI18n } from 'vue-i18n';
import { SessionPhase } from '../enums/session-phase.ts';
import type { SessionGateEmits, SessionGateProps } from '../types.ts';

defineProps<SessionGateProps>();
const emit = defineEmits<SessionGateEmits>();

const { t } = useI18n();
</script>

<template>
  <p v-if="phase === SessionPhase.Loading" role="status" class="text-text-muted">
    {{ t('session.loading') }}
  </p>
  <Card v-else-if="phase === SessionPhase.Failed">
    <div class="flex flex-col gap-4">
      <p role="alert" class="text-base text-text">{{ messageKey ? t(messageKey) : '' }}</p>
      <Button block @click="emit('retry')">{{ t('session.retry') }}</Button>
      <Button block :variant="ButtonVariant.Secondary" @click="emit('leave')">
        {{ t('session.backToWeek') }}
      </Button>
    </div>
  </Card>
</template>
