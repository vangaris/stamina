<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import { RoutePath } from '../../../enums/route-path.ts';
import { RedsCard } from '../../safety/index.ts';

const { t } = useI18n();
</script>

<template>
  <section class="flex flex-col gap-4">
    <h1 class="text-xl font-semibold">{{ t('settings.safety.title') }}</h1>
    <p class="text-base text-text-muted">{{ t('settings.safety.intro') }}</p>
    <RedsCard />
    <RouterLink
      :to="RoutePath.Settings"
      class="inline-block text-base font-medium text-accent underline"
    >
      {{ t('settings.back') }}
    </RouterLink>
  </section>
</template>
