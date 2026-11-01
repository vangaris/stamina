import { ButtonVariant } from './enums/button-variant.ts';

export const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  [ButtonVariant.Primary]: 'bg-accent text-on-accent hover:bg-accent/90',
  [ButtonVariant.Secondary]:
    'border border-border-strong bg-surface text-text hover:bg-surface-sunken',
  [ButtonVariant.Ghost]: 'bg-transparent text-accent hover:bg-accent-soft',
  [ButtonVariant.Danger]: 'bg-danger text-on-danger hover:bg-danger/90',
};
