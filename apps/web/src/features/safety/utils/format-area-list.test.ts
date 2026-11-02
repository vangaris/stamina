import { BodyArea } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { formatAreaList } from './format-area-list.ts';

const names: Record<BodyArea, string> = {
  [BodyArea.Neck]: 'Neck',
  [BodyArea.Shoulder]: 'Shoulder',
  [BodyArea.Elbow]: 'Elbow',
  [BodyArea.Wrist]: 'Wrist',
  [BodyArea.UpperBack]: 'Upper back',
  [BodyArea.LowerBack]: 'Lower back',
  [BodyArea.Hip]: 'Hip',
  [BodyArea.Knee]: 'Knee',
  [BodyArea.Ankle]: 'Ankle',
};

describe('formatAreaList', () => {
  it('names one area on its own, in lower case', () => {
    expect(formatAreaList([BodyArea.Knee], (area) => names[area], Locale.En)).toBe('knee');
  });

  it('joins several with "and"', () => {
    expect(
      formatAreaList([BodyArea.Knee, BodyArea.LowerBack, BodyArea.Hip], (a) => names[a], Locale.En),
    ).toBe('knee, lower back, and hip');
  });

  it('uses the language of the person', () => {
    expect(formatAreaList([BodyArea.Knee, BodyArea.Hip], () => 'Γόνατο', Locale.El)).toBe(
      'γόνατο και γόνατο',
    );
  });
});
