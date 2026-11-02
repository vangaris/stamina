<script setup lang="ts">
import { ConsentPurpose } from '@stamina/domain';
import { Button, ButtonType } from '@stamina/ui-button';
import { Checkbox } from '@stamina/ui-checkbox';
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { FieldError } from '../../onboarding/index.ts';
import { useConsent } from '../composables/useConsent.ts';
import { SafetyPhase } from '../enums/safety-phase.ts';
import SafetyGate from './SafetyGate.vue';
import ScreenFrame from './ScreenFrame.vue';

const { t } = useI18n();
const router = useRouter();
const { phase, accepted, errors, errorKey, busy, load, setAccepted, submit } = useConsent({
  onNavigate: (path) => void router.replace(path),
});

const error = computed(() => (errorKey.value ? t(errorKey.value) : undefined));

onMounted(load);
</script>

<template>
  <ScreenFrame v-if="phase === SafetyPhase.Ready" :title="t('consent.title')">
    <form class="flex flex-col gap-6" novalidate @submit.prevent="submit">
      <section class="flex flex-col gap-2">
        <p class="text-base text-text">{{ t('consent.disclaimer.text') }}</p>
        <Checkbox
          :model-value="accepted[ConsentPurpose.Disclaimer]"
          :error="errors.disclaimer ? t(errors.disclaimer) : ''"
          required
          @update:model-value="setAccepted(ConsentPurpose.Disclaimer, $event)"
        >
          {{ t('consent.disclaimer.accept') }}
        </Checkbox>
      </section>
      <section class="flex flex-col gap-2" aria-labelledby="health-data-heading">
        <h2 id="health-data-heading" class="text-lg font-semibold">
          {{ t('consent.healthData.title') }}
        </h2>
        <p class="text-base text-text">{{ t('consent.healthData.intro') }}</p>
        <ul class="list-disc pl-6 text-base text-text">
          <li>{{ t('consent.healthData.collects') }}</li>
          <li>{{ t('consent.healthData.where') }}</li>
          <li>{{ t('consent.healthData.sharing') }}</li>
          <li>{{ t('consent.healthData.withdraw') }}</li>
        </ul>
        <Checkbox
          :model-value="accepted[ConsentPurpose.HealthData]"
          :error="errors.healthData ? t(errors.healthData) : ''"
          required
          @update:model-value="setAccepted(ConsentPurpose.HealthData, $event)"
        >
          {{ t('consent.healthData.accept') }}
        </Checkbox>
      </section>
      <FieldError :message="error" />
      <Button :type="ButtonType.Submit" :disabled="busy" block>
        {{ t('consent.actions.continue') }}
      </Button>
    </form>
  </ScreenFrame>
  <SafetyGate v-else :phase="phase" @retry="load" />
</template>
