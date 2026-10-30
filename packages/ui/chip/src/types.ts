export type ChipMode = 'toggle' | 'radio' | 'check';

export interface ChipProps {
  selected?: boolean;
  /**
   * How assistive tech announces it: a standalone `toggle` ("pressed"), or one option of a
   * `radio` / `check` group (ChipGroup sets these).
   */
  mode?: ChipMode;
  disabled?: boolean;
}
