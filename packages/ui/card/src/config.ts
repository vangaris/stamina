import { CardPadding } from './enums/card-padding.ts';
import { CardTone } from './enums/card-tone.ts';

// Tones carry a thick left border in the tone colour, so the tone is not colour alone.
export const CARD_TONE_CLASSES: Record<CardTone, string> = {
  [CardTone.Default]: 'border-border bg-surface text-text',
  [CardTone.Accent]: 'border-border border-l-4 border-l-accent bg-accent-soft text-on-accent-soft',
  [CardTone.Load]: 'border-border border-l-4 border-l-load bg-load-soft text-on-load-soft',
  [CardTone.Suggest]:
    'border-border border-l-4 border-l-suggest bg-suggest-soft text-on-suggest-soft',
  [CardTone.Danger]: 'border-border border-l-4 border-l-danger bg-danger-soft text-on-danger-soft',
};

export const CARD_PADDING_CLASSES: Record<CardPadding, string> = {
  [CardPadding.Md]: 'p-4',
  [CardPadding.Lg]: 'p-6',
};
