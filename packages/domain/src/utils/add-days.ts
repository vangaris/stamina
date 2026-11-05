const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The calendar day `days` after (or before, when negative) `date`; both are `YYYY-MM-DD` in UTC. */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * MS_PER_DAY).toISOString().slice(0, 10);
}
