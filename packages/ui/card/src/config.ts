import type { CardPadding, CardTone } from './types.ts';

// Tones carry a thick left border in the tone colour, so the tone is not colour alone.
export const CARD_TONE_CLASSES: Record<CardTone, string> = {
  default: 'border-border bg-surface text-text',
  accent: 'border-border border-l-4 border-l-accent bg-accent-soft text-on-accent-soft',
  load: 'border-border border-l-4 border-l-load bg-load-soft text-on-load-soft',
  suggest: 'border-border border-l-4 border-l-suggest bg-suggest-soft text-on-suggest-soft',
  danger: 'border-border border-l-4 border-l-danger bg-danger-soft text-on-danger-soft',
};

export const CARD_PADDING_CLASSES: Record<CardPadding, string> = {
  md: 'p-4',
  lg: 'p-6',
};
