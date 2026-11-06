/** "6" when the range is one number, else "4-6". */
export function formatRepRange({ repMin, repMax }: { repMin: number; repMax: number }): string {
  return repMin === repMax ? `${repMin}` : `${repMin}-${repMax}`;
}
