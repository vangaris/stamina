<script setup lang="ts">
import { TextField, TextFieldInputmode, TextFieldType } from '@stamina/ui-text-field';
import { computed, ref } from 'vue';

const birthYear = ref('1992');
const email = ref('');
const code = ref('');
const sport = ref('Padel');
const weight = ref('78.5');
const badEmail = ref('aris@');
const locked = ref('Kitesurf');

const sportField = ref<InstanceType<typeof TextField> | null>(null);

// The error shows once the value is clearly wrong, so typing a fix clears it.
const emailError = computed(() =>
  email.value !== '' && !/^\S+@\S+\.\S+$/.test(email.value) ? 'Enter a valid e-mail address' : '',
);
const badEmailError = computed(() =>
  /^\S+@\S+\.\S+$/.test(badEmail.value) ? '' : 'Enter a valid e-mail address',
);
</script>

<template>
  <form class="flex max-w-md flex-col gap-4" @submit.prevent>
    <TextField
      v-model="birthYear"
      label="Birth year"
      :inputmode="TextFieldInputmode.Numeric"
      autocomplete="bday-year"
      :maxlength="4"
      placeholder="1990"
      name="birth-year"
      required
    />
    <TextField
      v-model="email"
      label="E-mail"
      :type="TextFieldType.Email"
      :inputmode="TextFieldInputmode.Email"
      autocomplete="email"
      placeholder="name@example.com"
      :error="emailError"
      name="email"
      required
    />
    <TextField
      v-model="code"
      label="Sign-in code"
      :inputmode="TextFieldInputmode.Numeric"
      autocomplete="one-time-code"
      :maxlength="6"
      hint="The 6 digits we sent to your e-mail"
      name="code"
    />
    <TextField
      ref="sportField"
      v-model="sport"
      label="Main sport"
      hint="Padel, kitesurf, running, climbing..."
    />
    <button
      type="button"
      class="min-h-tap self-start rounded-md border border-border-strong bg-surface px-4 text-base text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      @click="sportField?.focus()"
    >
      Focus the sport field
    </button>
    <TextField
      v-model="weight"
      label="Weight"
      :inputmode="TextFieldInputmode.Decimal"
      hint="Your morning weight is the most comparable"
    >
      <template #suffix>kg</template>
    </TextField>
    <TextField
      v-model="badEmail"
      label="E-mail (error state)"
      :type="TextFieldType.Email"
      :inputmode="TextFieldInputmode.Email"
      :error="badEmailError"
      hint="We never share it"
    />
    <TextField v-model="locked" label="Disabled field" disabled />
  </form>
</template>
