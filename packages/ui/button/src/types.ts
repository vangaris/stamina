import type { ButtonType } from './enums/button-type.ts';
import type { ButtonVariant } from './enums/button-variant.ts';

export interface ButtonProps {
  variant?: ButtonVariant;
  /** Defaults to "button" so a Button inside a form never submits it by accident. */
  type?: ButtonType;
  disabled?: boolean;
  /** Fill the width of the parent (primary actions at the bottom of a screen). */
  block?: boolean;
}
