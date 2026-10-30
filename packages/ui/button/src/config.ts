import type { ButtonVariant } from './types.ts';

export const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent/90',
  secondary: 'border border-border-strong bg-surface text-text hover:bg-surface-sunken',
  ghost: 'bg-transparent text-accent hover:bg-accent-soft',
  danger: 'bg-danger text-on-danger hover:bg-danger/90',
};
