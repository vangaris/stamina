<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { Card } from '@stamina/ui-card';
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { i18n } from '../../../i18n.ts';
import { useProgress } from '../composables/useProgress.ts';
import { ProgressStatus } from '../enums/progress-status.ts';
import { toCountKey } from '../utils/to-count-key.ts';
import ProgressCount from './ProgressCount.vue';
import ProgressLoadCard from './ProgressLoadCard.vue';
import ProgressVerdict from './ProgressVerdict.vue';
import WeighInCard from './WeighInCard.vue';

const { t } = useI18n();
const { locale } = i18n.global;
const router = useRouter();
const flow = useProgress({
  onNavigate: (path) => void router.replace(path),
  locale: () => locale.value,
});
const { status, messageKey, progress, weeks, verdict, weight, weighingIn } = flow;
const { weighInStatus, weighInMessageKey } = flow;

onMounted(flow.load);
</script>

<template>
  <section class="flex flex-col gap-4">
    <h1 class="text-xl font-semibold">{{ t('nav.progress') }}</h1>
    <p v-if="status === ProgressStatus.Loading" role="status" class="text-base text-text-muted">
      {{ t('progress.loading') }}
    </p>
    <Card v-else-if="status === ProgressStatus.Failed" data-testid="progress-failed">
      <div class="flex flex-col gap-3">
        <p role="alert" class="text-base text-text">{{ messageKey ? t(messageKey) : '' }}</p>
        <Button :variant="ButtonVariant.Secondary" @click="flow.load">
          {{ t('progress.retry') }}
        </Button>
      </div>
    </Card>
    <template v-else-if="progress && verdict">
      <ProgressVerdict :message="verdict" />
      <ProgressCount
        :label="t('progress.sessions.label')"
        :value-text="
          t(toCountKey('progress.sessions', progress.sessions.done, progress.sessions.planned), {
            done: progress.sessions.done,
            planned: progress.sessions.planned,
          })
        "
        :done="progress.sessions.done"
        :planned="progress.sessions.planned"
        data-testid="progress-sessions"
      />
      <ProgressCount
        :label="t('progress.activities.label')"
        :value-text="
          t(
            toCountKey(
              'progress.activities',
              progress.activities.logged,
              progress.activities.planned,
            ),
            { logged: progress.activities.logged, planned: progress.activities.planned },
          )
        "
        :done="progress.activities.logged"
        :planned="progress.activities.planned"
        data-testid="progress-activities"
      />
      <ProgressLoadCard :weeks="weeks" :average="progress.average" :locale="locale" />
      <WeighInCard
        v-model:weight="weight"
        :latest="progress.weighIn.latest"
        :due="progress.weighIn.due"
        :locale="locale"
        :saving="weighingIn"
        :status="weighInStatus"
        :message-key="weighInMessageKey"
        @submit="flow.submitWeighIn"
      />
    </template>
  </section>
</template>
