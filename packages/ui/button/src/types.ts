export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  variant?: ButtonVariant;
  /** Defaults to "button" so a Button inside a form never submits it by accident. */
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  /** Fill the width of the parent (primary actions at the bottom of a screen). */
  block?: boolean;
}
