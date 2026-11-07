<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import { RoutePath } from '../../../enums/route-path.ts';

const { t } = useI18n();
</script>

<template>
  <section class="flex flex-col gap-4">
    <h1 class="text-xl font-semibold">{{ t('settings.title') }}</h1>
    <RouterLink
      :to="RoutePath.SettingsSafety"
      data-testid="settings-safety-link"
      class="inline-block text-base font-medium text-accent underline"
    >
      {{ t('settings.safety.link') }}
    </RouterLink>
  </section>
</template>
