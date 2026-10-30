<script setup lang="ts">
import { Button, ButtonType, ButtonVariant } from '@stamina/ui-button';
import { Card, CardElement } from '@stamina/ui-card';
import { TextField, TextFieldInputmode, TextFieldType } from '@stamina/ui-text-field';
import { computed, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { EMAIL_AUTOCOMPLETE } from '../config.ts';
import type { EmailStepEmits, EmailStepProps } from '../types.ts';

const props = defineProps<EmailStepProps>();
const emit = defineEmits<EmailStepEmits>();

const { t } = useI18n();
const headingId = useId();
const error = computed(() => (props.errorKey ? t(props.errorKey) : undefined));
</script>

<template>
  <Card :as="CardElement.Section" :labelled-by="headingId">
    <form class="flex flex-col gap-4" novalidate @submit.prevent="emit('submit')">
      <h1 :id="headingId" class="text-xl font-semibold">{{ t('signIn.email.title') }}</h1>
      <TextField
        :model-value="email"
        :label="t('signIn.email.label')"
        :hint="t('signIn.email.hint')"
        :error="error"
        :type="TextFieldType.Email"
        :inputmode="TextFieldInputmode.Email"
        :autocomplete="EMAIL_AUTOCOMPLETE"
        required
        @update:model-value="emit('update:email', $event)"
      />
      <Button :type="ButtonType.Submit" :disabled="busy" block>
        {{ t('signIn.email.submit') }}
      </Button>
      <p class="text-center text-sm text-text-muted">{{ t('signIn.email.or') }}</p>
      <Button :variant="ButtonVariant.Secondary" :disabled="busy" block @click="emit('google')">
        {{ t('signIn.email.google') }}
      </Button>
    </form>
  </Card>
</template>
