<script setup lang="ts">
import { Button } from '@stamina/ui-button';
import { Card } from '@stamina/ui-card';
import { useI18n } from 'vue-i18n';
import { SafetyPhase } from '../enums/safety-phase.ts';
import type { SafetyGateEmits, SafetyGateProps } from '../types.ts';

defineProps<SafetyGateProps>();
const emit = defineEmits<SafetyGateEmits>();

const { t } = useI18n();
</script>

<template>
  <p v-if="phase === SafetyPhase.Loading" role="status" class="text-text-muted">
    {{ t('safety.loading') }}
  </p>
  <Card v-else-if="phase === SafetyPhase.Failed">
    <div class="flex flex-col gap-4">
      <p role="alert" class="text-base text-text">{{ t('safety.loadFailed.message') }}</p>
      <Button block @click="emit('retry')">{{ t('safety.loadFailed.retry') }}</Button>
    </div>
  </Card>
</template>
