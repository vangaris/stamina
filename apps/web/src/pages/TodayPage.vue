<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import { useApiHealth } from '../composables/useApiHealth.ts';
import { RoutePath } from '../enums/route-path.ts';
import { PlayedContainer } from '../features/activity/index.ts';
import { CheckinContainer } from '../features/checkin/index.ts';
import { RestNoticeContainer } from '../features/stop-flag/index.ts';

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
    <div class="mt-4 flex flex-col gap-4">
      <RestNoticeContainer />
      <CheckinContainer />
    </div>
    <div class="mt-4">
      <PlayedContainer />
    </div>
    <RouterLink
      :to="RoutePath.Week"
      data-testid="week-link"
      class="mt-4 inline-block text-base font-medium text-accent underline"
    >
      {{ t('week.link') }}
    </RouterLink>
  </section>
</template>
