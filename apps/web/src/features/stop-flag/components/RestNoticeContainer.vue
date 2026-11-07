<script setup lang="ts">
import { Card, CardElement, CardTone } from '@stamina/ui-card';
import { onMounted, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRestNotice } from '../composables/useRestNotice.ts';
import { StopOutcomeKind } from '../enums/stop-outcome-kind.ts';

const { t } = useI18n();
const { visible, load } = useRestNotice();
const headingId = useId();

onMounted(load);
</script>

<template>
  <Card
    v-if="visible"
    :as="CardElement.Section"
    :tone="CardTone.Suggest"
    :labelled-by="headingId"
    data-testid="rest-notice"
  >
    <div class="flex flex-col gap-1">
      <h2 :id="headingId" class="text-lg font-semibold">
        {{ t(`stopFlag.outcome.${StopOutcomeKind.Rest}.title`) }}
      </h2>
      <p class="text-base">{{ t(`stopFlag.outcome.${StopOutcomeKind.Rest}.body`) }}</p>
    </div>
  </Card>
</template>
