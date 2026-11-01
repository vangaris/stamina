export type StepperFormat = (value: number) => string;

export interface StepperProps {
  /** Visible label, also the accessible name of the value ("Weight"). */
  label: string;
  /** Accessible name of the minus button ("Decrease weight"). Supplied by the caller. */
  decrementLabel: string;
  /** Accessible name of the plus button ("Increase weight"). Supplied by the caller. */
  incrementLabel: string;
  /** Lowest value; unbounded when omitted. */
  min?: number | undefined;
  /** Highest value; unbounded when omitted. */
  max?: number | undefined;
  step?: number;
  /** Shown next to the value and read with it ("kg", "reps"). */
  unit?: string | undefined;
  /** Display format of the value, e.g. a locale-aware `Intl.NumberFormat` (Greek decimal comma). */
  format?: StepperFormat;
  disabled?: boolean;
}
