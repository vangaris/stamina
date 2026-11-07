<script setup lang="ts">
import { RATE_CHECK_LOSS_PCT } from '@stamina/domain';
import { Card, CardElement, CardTone } from '@stamina/ui-card';
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const headingId = useId();
</script>

<template>
  <Card
    :as="CardElement.Section"
    :tone="CardTone.Accent"
    :labelled-by="headingId"
    data-testid="dietitian-prompt"
  >
    <div class="flex flex-col gap-2">
      <h2 :id="headingId" class="text-base font-semibold">{{ t('meals.rateCheck.promptTitle') }}</h2>
      <p class="text-base text-text">{{ t('meals.rateCheck.prompt', { percent: RATE_CHECK_LOSS_PCT }) }}</p>
    </div>
  </Card>
</template>
