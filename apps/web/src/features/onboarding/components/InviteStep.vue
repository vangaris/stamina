<script setup lang="ts">
import { INVITE_CODE_INPUT_MAX_LENGTH } from '@stamina/domain';
import { Button, ButtonType, ButtonVariant } from '@stamina/ui-button';
import { Card, CardElement } from '@stamina/ui-card';
import { TextField } from '@stamina/ui-text-field';
import { computed, onMounted, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import type { InviteStepEmits, InviteStepProps } from '../types.ts';

const props = defineProps<InviteStepProps>();
const emit = defineEmits<InviteStepEmits>();

const { t } = useI18n();
const headingId = useId();
const error = computed(() => (props.errorKey ? t(props.errorKey) : undefined));
const notice = computed(() => (props.noticeKey ? t(props.noticeKey) : undefined));

const field = ref<InstanceType<typeof TextField> | null>(null);
onMounted(() => field.value?.focus());
</script>

<template>
  <Card :as="CardElement.Section" :labelled-by="headingId">
    <form class="flex flex-col gap-4" novalidate @submit.prevent="emit('submit')">
      <div class="flex flex-col gap-1">
        <h1 :id="headingId" class="text-xl font-semibold">{{ t('start.title') }}</h1>
        <p class="text-sm text-text-muted">{{ t('start.description') }}</p>
      </div>
      <!-- Always rendered so that the notice is announced when it appears. -->
      <div role="status" class="empty:hidden">
        <p v-if="notice" class="rounded-md bg-surface-sunken px-2 py-1 text-sm text-text">
          {{ notice }}
        </p>
      </div>
      <TextField
        ref="field"
        :model-value="code"
        :label="t('start.label')"
        :hint="t('start.hint')"
        :error="error"
        autocomplete="off"
        :maxlength="INVITE_CODE_INPUT_MAX_LENGTH"
        autocapitalize="characters"
        spellcheck="false"
        required
        @update:model-value="emit('update:code', $event)"
      />
      <Button :type="ButtonType.Submit" :disabled="busy" block>{{ t('start.submit') }}</Button>
      <Button :variant="ButtonVariant.Ghost" block @click="emit('sign-in')">
        {{ t('start.haveAccount') }}
      </Button>
    </form>
  </Card>
</template>
