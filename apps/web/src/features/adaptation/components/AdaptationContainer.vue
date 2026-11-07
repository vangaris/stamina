<script setup lang="ts">
import { SuggestionCard } from '@stamina/ui-suggestion-card';
import { onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { AdaptationCardState } from '../enums/adaptation-card-state.ts';
import { AdaptationMessageKey } from '../enums/adaptation-message-key.ts';
import { AdaptationTestId } from '../enums/adaptation-test-id.ts';
import { useAdaptations } from '../composables/useAdaptations.ts';
import type { AdaptationContainerProps } from '../types.ts';

const props = defineProps<AdaptationContainerProps>();
const { t } = useI18n();
const router = useRouter();
const adaptations = useAdaptations({
  onNavigate: (path) => void router.replace(path),
  weekdayLabel: (weekday) => t(`onboarding.weekdays.${weekday}`),
});
const { cards, noticeKey } = adaptations;

onMounted(adaptations.load);
watch(() => props.refreshKey, adaptations.load);
</script>

<template>
  <div v-if="cards.length > 0 || noticeKey" class="flex flex-col gap-4">
    <p
      v-if="noticeKey"
      role="status"
      class="text-base text-text"
      :data-testid="AdaptationTestId.Notice"
    >
      {{ t(noticeKey) }}
    </p>
    <SuggestionCard
      v-for="card in cards"
      :key="card.id"
      :title="t(AdaptationMessageKey.Title)"
      :change="t(card.change.key, card.change.params)"
      :reason="t(card.reason.key, card.reason.params)"
      :accept-label="t(AdaptationMessageKey.Accept)"
      :decline-label="t(AdaptationMessageKey.Decline)"
      :busy="card.state === AdaptationCardState.Busy"
      :decided-note="
        card.state === AdaptationCardState.Queued ? t(AdaptationMessageKey.Queued) : undefined
      "
      :accept-test-id="AdaptationTestId.Accept"
      :decline-test-id="AdaptationTestId.Decline"
      :data-testid="AdaptationTestId.Card"
      @accept="adaptations.accept(card.id)"
      @decline="adaptations.decline(card.id)"
    />
  </div>
</template>
