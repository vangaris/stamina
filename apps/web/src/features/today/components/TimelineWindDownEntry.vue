<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-1 flex-col gap-1 rounded-md border border-border px-3 py-2">
    <p class="text-base font-semibold text-text">{{ t('today.windDown.title') }}</p>
    <p class="text-sm text-text-muted">{{ t('today.windDown.body') }}</p>
  </div>
</template>
