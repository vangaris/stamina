import { describe, expect, it } from 'vitest';
import { ToastTone } from '../enums/toast-tone.ts';
import type { ToastItem } from '../types.ts';
import { partitionToasts } from './partition-toasts.ts';

describe('partitionToasts', () => {
  it('sends danger to alert and info, success and toneless to status, keeping order', () => {
    const toasts: ToastItem[] = [
      { id: '1', message: 'a', tone: ToastTone.Danger },
      { id: '2', message: 'b' },
      { id: '3', message: 'c', tone: ToastTone.Success },
      { id: '4', message: 'd', tone: ToastTone.Danger },
      { id: '5', message: 'e', tone: ToastTone.Info },
    ];
    const { status, alert } = partitionToasts(toasts);
    expect(status.map((t) => t.id)).toEqual(['2', '3', '5']);
    expect(alert.map((t) => t.id)).toEqual(['1', '4']);
  });

  it('returns two empty lists for an empty queue', () => {
    expect(partitionToasts([])).toEqual({ status: [], alert: [] });
  });
});
