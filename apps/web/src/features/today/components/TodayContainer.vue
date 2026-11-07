<script setup lang="ts">
import { NutritionStatus } from '@stamina/contracts';
import { Button, ButtonVariant } from '@stamina/ui-button';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRouter } from 'vue-router';
import { useApiHealth } from '../../../composables/useApiHealth.ts';
import { RoutePath } from '../../../enums/route-path.ts';
import { i18n } from '../../../i18n.ts';
import { PlayedContainer } from '../../activity/index.ts';
import { AdaptationContainer } from '../../adaptation/index.ts';
import { CheckinContainer } from '../../checkin/index.ts';
import { UnlockMealsCard, useNutrition } from '../../nutrition/index.ts';
import { RestNoticeContainer } from '../../stop-flag/index.ts';
import { useToday } from '../composables/useToday.ts';
import { TodayStatus } from '../enums/today-status.ts';
import { toTimelineExtras } from '../utils/to-timeline-extras.ts';
import TodayHeader from './TodayHeader.vue';
import TodayTimeline from './TodayTimeline.vue';

const { t } = useI18n();
const { locale } = i18n.global;
const router = useRouter();
const { state } = useApiHealth();
const onNavigate = (path: RoutePath) => void router.replace(path);
const nutritionFlow = useNutrition({ onNavigate });
const { nutrition } = nutritionFlow;
const today = useToday({
  onNavigate,
  extras: () => toTimelineExtras(nutrition.value, locale.value),
});
const { status, date, entries, summary } = today;

/** Bumped when an Activity or a Check-in reached the server: the suggestions it may have raised are read again. */
const suggestionsKey = ref(0);
const readSuggestions = () => {
  suggestionsKey.value += 1;
};
/** A saved Activity changes the day's Load and may raise a suggestion. */
const playedSaved = () => {
  readSuggestions();
  void today.load();
  // The day type, and so the targets, may have changed.
  void nutritionFlow.load();
};

const apiStatus = computed(() => t(`status.${state.value.kind}`));

onMounted(() => {
  void today.load();
  void nutritionFlow.load();
});
</script>

<template>
  <section class="flex flex-col gap-4">
    <TodayHeader :date="date" :locale="locale" :summary="summary" />
    <p data-testid="api-status" :data-state="state.kind" class="text-sm text-text-muted">
      {{ t('status.server', { state: apiStatus }) }}
    </p>
    <div class="flex flex-col gap-4">
      <AdaptationContainer :refresh-key="suggestionsKey" />
      <RestNoticeContainer />
      <CheckinContainer @saved="readSuggestions" />
    </div>
    <p v-if="status === TodayStatus.Loading" role="status" class="text-base text-text-muted">
      {{ t('today.loading') }}
    </p>
    <template v-else>
      <div
        v-if="status === TodayStatus.Failed"
        class="flex flex-col gap-2"
        data-testid="today-failed"
      >
        <p role="alert" class="text-base text-text">{{ t('today.errors.failed') }}</p>
        <Button :variant="ButtonVariant.Secondary" @click="today.load">
          {{ t('today.errors.retry') }}
        </Button>
      </div>
      <UnlockMealsCard v-if="nutrition?.status === NutritionStatus.Locked" />
      <TodayTimeline :entries="entries" :locale="locale" @log-water="nutritionFlow.addWater" />
    </template>
    <RouterLink
      :to="RoutePath.Settings"
      data-testid="settings-link"
      class="inline-block text-base font-medium text-accent underline"
    >
      {{ t('settings.link') }}
    </RouterLink>
    <RouterLink
      :to="RoutePath.Week"
      data-testid="week-link"
      class="inline-block text-base font-medium text-accent underline"
    >
      {{ t('week.link') }}
    </RouterLink>
    <PlayedContainer @saved="playedSaved" />
  </section>
</template>
