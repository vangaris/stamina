import { describe, expect, it } from 'vitest';
import { LIMITED_RIR_FLOOR, MAX_RIR } from '../config.ts';
import { Emphasis } from '../enums/emphasis.ts';
import { SessionSlot } from '../enums/session-slot.ts';
import type { PrescribeInput } from '../types.ts';
import { prescribe } from './prescribe.ts';

const input: PrescribeInput = {
  slot: SessionSlot.MainStrength,
  emphasis: Emphasis.Strength,
  weekInBlock: 1,
  limited: false,
  rirSuitable: true,
  needsEquipment: true,
};

describe('prescribe rirBoost', () => {
  it('is unchanged when absent or zero', () => {
    expect(prescribe({ ...input, rirBoost: 0 })).toEqual(prescribe(input));
    expect(prescribe(input).rir).toBe(3);
  });

  it('adds reps in reserve to rated exercises', () => {
    expect(prescribe({ ...input, rirBoost: 1 }).rir).toBe(4);
    expect(prescribe({ ...input, slot: SessionSlot.AccessoriesCore, rirBoost: 1 }).rir).toBe(4);
  });

  it('never goes past the most reps in reserve', () => {
    expect(prescribe({ ...input, weekInBlock: 4, rirBoost: 1 }).rir).toBe(MAX_RIR);
    expect(prescribe({ ...input, weekInBlock: 4, rirBoost: 3 }).rir).toBe(MAX_RIR);
  });

  it('adds on top of the Limited floor', () => {
    expect(prescribe({ ...input, weekInBlock: 3, limited: true, rirBoost: 1 }).rir).toBe(
      LIMITED_RIR_FLOOR + 1,
    );
  });

  it('leaves unrated exercises unrated and changes nothing else', () => {
    const plain = prescribe({ ...input, rirSuitable: false });
    const boosted = prescribe({ ...input, rirSuitable: false, rirBoost: 2 });
    expect(boosted).toEqual(plain);
    expect(boosted.rir).toBeNull();
    const warmUp = prescribe({ ...input, slot: SessionSlot.WarmUp, rirBoost: 2 });
    expect(warmUp.rir).toBeNull();
    expect(prescribe({ ...input, rirBoost: 2 }).sets).toBe(prescribe(input).sets);
  });
});
