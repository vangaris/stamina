<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { Card, CardTone } from '@stamina/ui-card';
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';
import type { DoneViewEmits, DoneViewProps } from '../types.ts';

defineProps<DoneViewProps>();
const emit = defineEmits<DoneViewEmits>();

const { t } = useI18n();
const titleId = useId();
</script>

<template>
  <section class="flex flex-col gap-4" :aria-labelledby="titleId" data-testid="done-view">
    <h1 :id="titleId" class="text-xl font-semibold">{{ t('session.done.title') }}</h1>
    <Card :tone="CardTone.Load">
      <div class="flex flex-col gap-2">
        <p class="text-3xl font-semibold tabular-nums" data-testid="done-load">
          {{ t('session.done.load', { load: finished.load }) }}
        </p>
        <p class="text-base text-text">
          {{ t('session.done.explanation', { rpe: finished.rpe, minutes: finished.minutes }) }}
        </p>
      </div>
    </Card>
    <p role="status" class="text-sm text-text-muted" data-testid="done-sync">
      {{ finished.queued ? t('session.done.queued') : t('session.done.saved') }}
    </p>
    <Button block @click="emit('today')">{{ t('session.done.today') }}</Button>
    <Button block :variant="ButtonVariant.Secondary" @click="emit('week')">
      {{ t('session.done.week') }}
    </Button>
  </section>
</template>
