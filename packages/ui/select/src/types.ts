export interface SelectOption {
  /** Sent in `v-model` when chosen. Must not be the empty string, which means "nothing chosen". */
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  /** Visible label; it is the accessible name. */
  label: string;
  options: SelectOption[];
  /** Text of the empty first option shown until something is chosen ("Choose a country"). */
  placeholder: string;
  /** Helper text under the field. Part of the accessible description. */
  hint?: string | undefined;
  /** Error message. Sets `aria-invalid`, is announced, and is shown with an icon. */
  error?: string | undefined;
  required?: boolean;
  disabled?: boolean;
  /** Browser autofill hint, e.g. `country`. */
  autocomplete?: string | undefined;
  name?: string | undefined;
}
