export type TextFieldType = 'text' | 'email' | 'tel' | 'password' | 'search' | 'url';
export type TextFieldInputmode =
  'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';

export interface TextFieldProps {
  /** Visible label; it is the accessible name. Never replaced by the placeholder. */
  label: string;
  type?: TextFieldType;
  /** Which on-screen keyboard to show: `numeric` for a birth year, `decimal` for a weight. */
  inputmode?: TextFieldInputmode | undefined;
  autocomplete?: string | undefined;
  placeholder?: string | undefined;
  /** Helper text under the field. Part of the accessible description. */
  hint?: string | undefined;
  /** Error message. Sets `aria-invalid`, is announced, and is shown with an icon. */
  error?: string | undefined;
  required?: boolean;
  disabled?: boolean;
  maxlength?: number | undefined;
  name?: string | undefined;
}
