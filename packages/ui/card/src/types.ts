import type { CardElement } from './enums/card-element.ts';
import type { CardPadding } from './enums/card-padding.ts';
import type { CardTone } from './enums/card-tone.ts';

export interface CardProps {
  /** Root element. */
  as?: CardElement;
  tone?: CardTone;
  padding?: CardPadding;
  /** Id of the heading (in the caller's markup) that names a `section` / `article` card. */
  labelledBy?: string | undefined;
}
