<script setup lang="ts">
import { Button } from '@stamina/ui-button';
import { Card } from '@stamina/ui-card';
import { useI18n } from 'vue-i18n';
import { ProgramPhase } from '../enums/program-phase.ts';
import type { ProgramGateEmits, ProgramGateProps } from '../types.ts';

defineProps<ProgramGateProps>();
const emit = defineEmits<ProgramGateEmits>();

const { t } = useI18n();
</script>

<template>
  <p v-if="phase === ProgramPhase.Loading" role="status" class="text-text-muted">
    {{ t('program.loading') }}
  </p>
  <Card v-else-if="phase === ProgramPhase.Failed">
    <div class="flex flex-col gap-4">
      <p role="alert" class="text-base text-text">{{ messageKey ? t(messageKey) : '' }}</p>
      <Button block @click="emit('retry')">{{ t('program.retry') }}</Button>
    </div>
  </Card>
</template>
