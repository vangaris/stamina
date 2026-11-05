import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { formatDate } from './format-date.ts';

describe('formatDate', () => {
  it("names the weekday and month in the person's language, whatever the time zone", () => {
    const english = formatDate('2026-11-06', Locale.En);
    expect(english).toContain('Friday');
    expect(english).toContain('November');
    expect(formatDate('2026-11-06', Locale.El)).toContain('Παρασκευή');
  });
});
