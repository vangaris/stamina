import { describe, expect, it } from 'vitest';
import { BodyHalf } from '../enums/body-half.ts';
import { MovementPattern } from '../enums/movement-pattern.ts';
import { bodyHalfOf } from './body-half-of.ts';

describe('bodyHalfOf', () => {
  it('maps the lower-body patterns to lower', () => {
    for (const pattern of [
      MovementPattern.Squat,
      MovementPattern.Hinge,
      MovementPattern.Lunge,
      MovementPattern.JumpLand,
      MovementPattern.ChangeOfDirection,
    ]) {
      expect(bodyHalfOf(pattern)).toBe(BodyHalf.Lower);
    }
  });
  it('maps every other pattern to upper', () => {
    for (const pattern of [
      MovementPattern.Push,
      MovementPattern.Pull,
      MovementPattern.Overhead,
      MovementPattern.Carry,
      MovementPattern.Rotation,
      MovementPattern.Core,
      MovementPattern.Mobility,
    ]) {
      expect(bodyHalfOf(pattern)).toBe(BodyHalf.Upper);
    }
  });
});
