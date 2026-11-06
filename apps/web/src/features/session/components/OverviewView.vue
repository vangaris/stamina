<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';
import type { OverviewViewEmits, OverviewViewProps } from '../types.ts';

defineProps<OverviewViewProps>();
const emit = defineEmits<OverviewViewEmits>();

const { t } = useI18n();
const titleId = useId();
</script>

<template>
  <section class="flex flex-col gap-4" :aria-labelledby="titleId" data-testid="overview-view">
    <h1 :id="titleId" class="text-xl font-semibold">{{ t('session.overview.title') }}</h1>
    <table class="w-full border-collapse text-left">
      <caption class="sr-only">
        {{
          t('session.overview.caption')
        }}
      </caption>
      <thead>
        <tr class="border-b border-border text-sm text-text-muted">
          <th scope="col" class="py-2 pr-2 font-medium">{{ t('session.overview.exercise') }}</th>
          <th scope="col" class="px-2 py-2 font-medium">{{ t('session.overview.plan') }}</th>
          <th scope="col" class="py-2 pl-2 font-medium">{{ t('session.overview.done') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.index"
          class="border-b border-border"
          :class="row.current && 'bg-surface-muted'"
          :aria-current="row.current ? 'step' : undefined"
          data-testid="overview-row"
        >
          <th scope="row" class="py-2 pr-2 font-normal">
            <button
              type="button"
              class="min-h-tap w-full text-left text-base font-medium text-text underline focus-ring"
              @click="emit('select', row.index)"
            >
              {{ row.name }}
            </button>
            <span class="block text-sm text-text-muted">
              {{ t(`program.blocks.${row.slot}`) }}
            </span>
          </th>
          <td class="px-2 py-2 text-sm text-text">
            {{ t(row.prescription.key, row.prescription.params ?? {}) }}
          </td>
          <td class="py-2 pl-2 text-sm whitespace-nowrap text-text tabular-nums">
            {{ t('session.overview.rowDone', { done: row.doneSets, total: row.plannedSets }) }}
          </td>
        </tr>
      </tbody>
    </table>
    <Button block data-testid="overview-finish" @click="emit('finish')">
      {{ t('session.overview.finish') }}
    </Button>
    <Button block :variant="ButtonVariant.Secondary" @click="emit('back')">
      {{ t('session.overview.back') }}
    </Button>
  </section>
</template>
