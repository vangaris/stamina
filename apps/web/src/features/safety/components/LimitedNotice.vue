<script setup lang="ts">
import { Button } from '@stamina/ui-button';
import { useI18n } from 'vue-i18n';
import type { LimitedNoticeEmits } from '../types.ts';
import ScreenFrame from './ScreenFrame.vue';

const emit = defineEmits<LimitedNoticeEmits>();

const { t } = useI18n();
</script>

<template>
  <ScreenFrame :title="t('referred.limited.title')">
    <p class="text-base text-text">{{ t('referred.limited.body') }}</p>
    <Button block @click="emit('continue')">{{ t('referred.limited.continue') }}</Button>
  </ScreenFrame>
</template>
