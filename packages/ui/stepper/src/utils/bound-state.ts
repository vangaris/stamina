/** Whether `value` sits on (or beyond) the min / max bound; an omitted bound is never reached. */
export function boundState(value: number, min?: number, max?: number) {
  return {
    atMin: min !== undefined && value <= min,
    atMax: max !== undefined && value >= max,
  };
}
