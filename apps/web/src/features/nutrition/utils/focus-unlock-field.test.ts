import { describe, expect, it, vi } from 'vitest';
import { UnlockField } from '../enums/unlock-field.ts';
import { focusById, focusUnlockField, unlockFieldId } from './focus-unlock-field.ts';

const element = (chips: Record<string, HTMLElement | undefined> = {}) =>
  ({
    focus: vi.fn(),
    querySelector: (selector: string) =>
      selector.includes('tabindex') ? chips.tabbable : chips.first,
  }) as unknown as HTMLElement;

const documentWith = (id: string, target: HTMLElement) =>
  ({ getElementById: (asked: string) => (asked === id ? target : null) }) as unknown as Document;

describe('focusUnlockField', () => {
  it('focuses the input with the field id', () => {
    const input = element();

    focusUnlockField(UnlockField.Height, documentWith(unlockFieldId(UnlockField.Height), input));

    expect(input.focus).toHaveBeenCalledTimes(1);
  });

  it('focuses the chip in the tab order of a chip group', () => {
    const tabbable = element();
    const first = element();
    const group = element({ tabbable, first });

    focusUnlockField(UnlockField.Sex, documentWith(unlockFieldId(UnlockField.Sex), group));

    expect(tabbable.focus).toHaveBeenCalledTimes(1);
    expect(first.focus).not.toHaveBeenCalled();
  });

  it('falls back to the first chip', () => {
    const first = element();
    const group = element({ first });

    focusById('group', documentWith('group', group));

    expect(first.focus).toHaveBeenCalledTimes(1);
  });

  it('does nothing when there is no such element', () => {
    expect(() => focusById('missing', documentWith('other', element()))).not.toThrow();
  });
});
