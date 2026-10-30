export type CardTone = 'default' | 'accent' | 'load' | 'suggest' | 'danger';
export type CardPadding = 'md' | 'lg';
export type CardElement = 'div' | 'section' | 'article' | 'li';

export interface CardProps {
  /** Root element. */
  as?: CardElement;
  tone?: CardTone;
  padding?: CardPadding;
  /** Id of the heading (in the caller's markup) that names a `section` / `article` card. */
  labelledBy?: string | undefined;
}
