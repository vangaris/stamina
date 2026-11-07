<script setup lang="ts">
import { Button } from '@stamina/ui-button';
import { onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { PlayedStatus } from '../enums/played-status.ts';
import { usePlayed } from '../composables/usePlayed.ts';
import type { PlayedContainerEmits } from '../types.ts';
import PlayedSheet from './PlayedSheet.vue';

const emit = defineEmits<PlayedContainerEmits>();
const { t } = useI18n();
const router = useRouter();
const played = usePlayed({
  onNavigate: (path) => void router.replace(path),
  sportLabel: (sport) => t(`onboarding.sport.sport.options.${sport}`),
});
const { open, status, messageKey, draft, sportOptions, preview, saving, savedLoad } = played;

onMounted(played.load);
watch(status, (now) => {
  if (now === PlayedStatus.Saved) emit('saved');
});
</script>

<template>
  <!-- Sticks to the bottom of the screen, just above the tab bar once the page has scrolled to its end, so it is always in reach. `--played-bar-clearance` (style.css) keeps focused controls scrolled clear of it, so keep it at least this tall. -->
  <div
    class="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-t border-border bg-bg px-4 py-3"
    data-testid="played-bar"
  >
    <Button block class="min-h-16!" data-testid="played-open" @click="played.openSheet">
      {{ t('activity.played.open') }}
    </Button>
    <p
      v-if="messageKey && (status === PlayedStatus.Saved || status === PlayedStatus.Queued)"
      role="status"
      class="text-base text-text"
      data-testid="played-notice"
    >
      {{ t(messageKey, { load: savedLoad }) }}
    </p>
    <PlayedSheet
      v-model:open="open"
      v-model:sport="draft.sport"
      v-model:minutes="draft.minutes"
      v-model:intensity="draft.intensity"
      v-model:hot="draft.hot"
      :sport-options="sportOptions"
      :preview="preview"
      :saving="saving"
      :error-key="status === PlayedStatus.Failed ? messageKey : undefined"
      @save="played.save"
    />
  </div>
</template>
