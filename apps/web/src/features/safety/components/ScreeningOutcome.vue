<script setup lang="ts">
import { Button } from '@stamina/ui-button';
import { useI18n } from 'vue-i18n';
import { useOutcomeNotices } from '../composables/useOutcomeNotices.ts';
import type { ScreeningOutcomeEmits, ScreeningOutcomeProps } from '../types.ts';
import ScreenFrame from './ScreenFrame.vue';

const props = defineProps<ScreeningOutcomeProps>();
const emit = defineEmits<ScreeningOutcomeEmits>();

const { t } = useI18n();
const notices = useOutcomeNotices(() => props.outcome);
</script>

<template>
  <ScreenFrame :title="t('screening.outcome.title')">
    <ul v-if="notices.length > 0" class="flex flex-col gap-3 text-base text-text">
      <li v-for="notice in notices" :key="notice" class="rounded-md bg-surface-muted p-3">
        {{ notice }}
      </li>
    </ul>
    <Button block @click="emit('continue')">{{ t('screening.outcome.continue') }}</Button>
  </ScreenFrame>
</template>
