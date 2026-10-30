export interface CheckboxProps {
  /** Helper text shown under the label. The `description` slot overrides it. */
  description?: string;
  /** Validation message. Shown below the label, announced when it appears, and sets `aria-invalid`. */
  error?: string;
  disabled?: boolean;
  required?: boolean;
}
