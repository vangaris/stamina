<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useApiHealth } from '../composables/useApiHealth.ts';

const { t } = useI18n();
const { state } = useApiHealth();

const apiStatus = computed(() => t(`status.${state.value.kind}`));
</script>

<template>
  <section>
    <h1 class="text-xl font-semibold">{{ t('nav.today') }}</h1>
    <p data-testid="api-status" :data-state="state.kind" class="mt-2 text-sm text-text-muted">
      {{ t('status.server', { state: apiStatus }) }}
    </p>
  </section>
</template>
