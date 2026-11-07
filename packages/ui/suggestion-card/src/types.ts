export interface SuggestionCardProps {
  /** Heading that names the card. */
  title: string;
  /** What accepting changes, in one sentence. */
  change: string;
  /** Why it is suggested, with the numbers it was raised on. */
  reason: string;
  acceptLabel: string;
  declineLabel: string;
  /** Once the person has decided: shown in place of the buttons, which are then removed. */
  decidedNote?: string | undefined;
  /** A decision is on its way: both buttons wait. */
  busy?: boolean;
  /** `data-testid` of the accept button. */
  acceptTestId?: string | undefined;
  /** `data-testid` of the decline button. */
  declineTestId?: string | undefined;
}

export interface SuggestionCardEmits {
  (event: 'accept'): void;
  (event: 'decline'): void;
}
