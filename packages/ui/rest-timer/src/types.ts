/** Builds the screen-reader text for a moment worth announcing; the caller translates it. */
export type RestTimerAnnounce = (remainingSeconds: number) => string;

export interface RestTimerProps {
  /** Seconds left. Counted down by the caller; the component owns no timer. */
  remainingSeconds: number;
  /** Seconds the rest started with (the ring is `remainingSeconds / totalSeconds` full). */
  totalSeconds: number;
  /** Visible title and the dialog's accessible name, e.g. "Rest". */
  label: string;
  /** Text of the big Skip button. */
  skipLabel: string;
  /**
   * Text for the polite live region, e.g. "30 seconds left". Called only at moments worth
   * announcing (see `shouldAnnounce`), never every second.
   */
  announce: RestTimerAnnounce;
  /** What comes next, e.g. "Next: Bench press, set 3". The `next` slot replaces it. */
  nextLabel?: string | undefined;
  /** Text of the "add time" button, e.g. "+15 s". The button is hidden without it. */
  addLabel?: string | undefined;
}

export interface RestTimerEmits {
  /** The Skip button, or Escape. */
  skip: [];
  /** The add-time button; the caller decides how many seconds to add. */
  add: [];
}

export interface RingMetrics {
  /** Share of the rest still to go, 0-1. */
  fraction: number;
  circumference: number;
  /** `stroke-dashoffset` that leaves `fraction` of the ring painted. */
  dashOffset: number;
}
