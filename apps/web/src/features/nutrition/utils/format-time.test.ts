import { describe, expect, it } from 'vitest';
import { formatTime } from './format-time.ts';

describe('formatTime', () => {
  it('writes a minute of the day as a 24-hour clock time', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(480)).toBe('08:00');
    expect(formatTime(1175)).toBe('19:35');
  });
});
