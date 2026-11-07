<script setup lang="ts">
import { Card, CardElement } from '@stamina/ui-card';
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { REDS_SIGNS } from '../config.ts';

const { t } = useI18n();
const headingId = useId();
</script>

<template>
  <Card :as="CardElement.Section" :labelled-by="headingId" data-testid="reds-card">
    <div class="flex flex-col gap-3">
      <h2 :id="headingId" class="text-base font-semibold">{{ t('reds.title') }}</h2>
      <p class="text-sm text-text-muted">{{ t('reds.intro') }}</p>
      <ul class="flex list-disc flex-col gap-1 pl-5 text-base text-text">
        <li v-for="sign in REDS_SIGNS" :key="sign">{{ t(`reds.signs.${sign}`) }}</li>
      </ul>
      <p class="text-base font-medium text-text">{{ t('reds.talk') }}</p>
    </div>
  </Card>
</template>
