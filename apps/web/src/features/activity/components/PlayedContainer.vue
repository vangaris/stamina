<script setup lang="ts">
import { Button } from '@stamina/ui-button';
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { PlayedStatus } from '../enums/played-status.ts';
import { usePlayed } from '../composables/usePlayed.ts';
import PlayedSheet from './PlayedSheet.vue';

const { t } = useI18n();
const router = useRouter();
const played = usePlayed({
  onNavigate: (path) => void router.replace(path),
  sportLabel: (sport) => t(`onboarding.sport.sport.options.${sport}`),
});
const { open, status, messageKey, draft, sportOptions, preview, saving, savedLoad } = played;

onMounted(played.load);
</script>

<template>
  <div class="flex flex-col gap-3">
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
