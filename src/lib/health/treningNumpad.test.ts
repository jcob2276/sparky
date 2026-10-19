import { describe, expect, it } from 'vitest';
import {
  applyNumpadKey,
  clampNumpadValue,
  nextNumpadField,
  nudgeNumpadValue,
} from './treningNumpad';

describe('treningNumpad', () => {
  it('advances kg → reps → rir then stops', () => {
    expect(nextNumpadField('kg')).toBe('reps');
    expect(nextNumpadField('reps')).toBe('rir');
    expect(nextNumpadField('rir')).toBeNull();
  });

  it('replaces on first digit after focus, then appends', () => {
    const first = applyNumpadKey('70', '8', { fresh: true });
    expect(first).toEqual({ value: '8', fresh: false });
    const second = applyNumpadKey(first.value, '5', { fresh: first.fresh });
    expect(second.value).toBe('85');
  });

  it('handles decimal and ignores it on integer fields', () => {
    expect(applyNumpadKey('72', '.', { fresh: false }).value).toBe('72.');
    expect(applyNumpadKey('8', '.', { fresh: false, integer: true }).value).toBe('8');
    expect(applyNumpadKey('', '.', { fresh: true }).value).toBe('0.');
  });

  it('backspaces and nudges with clamp', () => {
    expect(applyNumpadKey('85', 'backspace', { fresh: false }).value).toBe('8');
    expect(nudgeNumpadValue('70', 1, 2.5)).toBe('72.5');
    expect(nudgeNumpadValue('0', -1, 2.5)).toBe('0');
    expect(clampNumpadValue('9', { max: 5 })).toBe('5');
  });
});
