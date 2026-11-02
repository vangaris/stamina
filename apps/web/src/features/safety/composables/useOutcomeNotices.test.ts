import type { SavedScreening } from '@stamina/contracts';
import { BodyArea, ScreeningStatus, StartingLevel, TrainingMode } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { afterEach, describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { i18n } from '../../../i18n.ts';
import type { ScreeningOutcomeView } from '../types.ts';
import { useOutcomeNotices } from './useOutcomeNotices.ts';

const cleared: SavedScreening = {
  status: ScreeningStatus.Cleared,
  referral: null,
  nutritionOff: false,
  excludedAreas: [],
  startingLevel: StartingLevel.Beginner,
  trainingMode: TrainingMode.Full,
  takenAt: '2026-11-02T10:00:00.000Z',
  doctorOkAt: null,
};

const outcome = (
  screening: Partial<SavedScreening> = {},
  goalChanged = false,
): ScreeningOutcomeView => ({ screening: { ...cleared, ...screening }, goalChanged });

const original = i18n.global.locale.value;
afterEach(() => {
  i18n.global.locale.value = original;
});

describe('useOutcomeNotices', () => {
  it('has no notice when the Screening changed nothing', () => {
    i18n.global.locale.value = Locale.En;

    expect(useOutcomeNotices(() => outcome()).value).toEqual([]);
  });

  it('has one notice per change, in this order: Nutrition off, Goal switched, areas excluded', () => {
    i18n.global.locale.value = Locale.En;

    const notices = useOutcomeNotices(() =>
      outcome({ nutritionOff: true, excludedAreas: [BodyArea.Knee, BodyArea.Hip] }, true),
    ).value;

    expect(notices).toEqual([
      "Nutrition is switched off for you, so Stamina won't give food guidance. Your training carries on.",
      "The body composition Goal isn't available while Nutrition is off, so your Goal is now General fitness. You can change it later.",
      'Get professional advice before training these areas: knee and hip. Stamina will keep exercises away from them.',
    ]);
  });

  it('uses the singular wording for one area', () => {
    i18n.global.locale.value = Locale.En;

    const [notice] = useOutcomeNotices(() => outcome({ excludedAreas: [BodyArea.Knee] })).value;

    expect(notice).toBe(
      'Get professional advice before training this area: knee. Stamina will keep exercises away from it.',
    );
  });

  it('names the areas in the language of the person', () => {
    i18n.global.locale.value = Locale.El;

    const [notice] = useOutcomeNotices(() =>
      outcome({ excludedAreas: [BodyArea.Knee, BodyArea.Hip] }),
    ).value;

    expect(notice).toContain('γόνατο και ισχίο');
  });

  it('follows a new outcome', () => {
    i18n.global.locale.value = Locale.En;
    const current = ref(outcome());
    const notices = useOutcomeNotices(() => current.value);
    expect(notices.value).toEqual([]);

    current.value = outcome({ nutritionOff: true });

    expect(notices.value).toHaveLength(1);
  });
});
