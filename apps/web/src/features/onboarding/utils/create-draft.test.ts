import { Units } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { createDraft } from './create-draft.ts';

describe('createDraft', () => {
  it('pre-fills language and units from the device', () => {
    expect(createDraft(['el-GR'])).toMatchObject({ locale: Locale.El, units: Units.Metric });
    expect(createDraft(['en-US'])).toMatchObject({ locale: Locale.En, units: Units.Imperial });
  });

  it('falls back to English and metric for a language Stamina does not speak', () => {
    expect(createDraft(['fr-FR'])).toMatchObject({ locale: Locale.En, units: Units.Metric });
  });

  it('leaves every question that needs an answer unanswered', () => {
    expect(createDraft([])).toMatchObject({
      needs: undefined,
      birthYear: '',
      country: '',
      sport: undefined,
      playIntensity: undefined,
      goal: undefined,
      sessionMinutes: undefined,
    });
  });
});
