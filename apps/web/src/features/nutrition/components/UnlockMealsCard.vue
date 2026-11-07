<script setup lang="ts">
import { Card, CardElement } from '@stamina/ui-card';
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import { RoutePath } from '../../../enums/route-path.ts';

const { t } = useI18n();
const headingId = useId();
</script>

<template>
  <Card :as="CardElement.Section" :labelled-by="headingId" data-testid="unlock-meals-card">
    <div class="flex flex-col gap-2">
      <h2 :id="headingId" class="text-base font-semibold">{{ t('meals.unlockCard.title') }}</h2>
      <p class="text-sm text-text-muted">{{ t('meals.unlockCard.body') }}</p>
      <RouterLink
        :to="RoutePath.Meals"
        data-testid="unlock-meals-link"
        class="inline-block text-base font-medium text-accent underline"
      >
        {{ t('meals.unlockCard.action') }}
      </RouterLink>
    </div>
  </Card>
</template>
