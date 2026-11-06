import { SessionSlot } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { restSecondsFor } from './rest-seconds-for.ts';

describe('restSecondsFor', () => {
  it('rests longest after main strength, then sport support, then accessories', () => {
    expect(restSecondsFor(SessionSlot.MainStrength)).toBe(120);
    expect(restSecondsFor(SessionSlot.SportSupport)).toBe(90);
    expect(restSecondsFor(SessionSlot.AccessoriesCore)).toBe(60);
  });

  it('has no rest after warm-up or cool-down', () => {
    expect(restSecondsFor(SessionSlot.WarmUp)).toBe(0);
    expect(restSecondsFor(SessionSlot.CoolDown)).toBe(0);
  });
});
