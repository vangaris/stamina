export interface SetDotsProps {
  /** Number of planned sets (one dot each). Negative and non-finite values show no dots. */
  total: number;
  /** Number of sets logged; the first `done` dots are filled. Clamped to `total`. */
  done: number;
  /** 0-based index of the set in progress, highlighted unless it is already done. */
  current?: number | undefined;
  /** Accessible text for the whole row, e.g. "Set 2 of 4". The dots themselves are silent. */
  label: string;
}
