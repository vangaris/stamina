import type { Weekday } from './enums/weekday.ts';

export interface EligibilityInput {
  birthYear: number;
  /** ISO 3166-1 alpha-2 country of residence. */
  country: string;
  /** The year "now" falls in; passed in so the rule stays pure. */
  currentYear: number;
}

export interface TrainingWeek {
  sessionsPerWeek: number;
  sessionMinutes: number;
  availableDays: readonly Weekday[];
}
