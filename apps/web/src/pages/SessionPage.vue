<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <section>
    <h1 class="text-xl font-semibold">{{ t('nav.session') }}</h1>
  </section>
</template>
