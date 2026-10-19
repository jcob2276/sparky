import { describe, it, expect, beforeEach } from 'vitest';
import { STORAGE_KEYS } from '../constants';
import {
  DEFAULT_TRENING_ACCENT,
  isTreningAccentId,
  readTreningAccent,
  writeTreningAccent,
} from './treningAccent';

describe('treningAccent', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEYS.TRENING_ACCENT);
  });

  it('validates known accent ids', () => {
    expect(isTreningAccentId('lime')).toBe(true);
    expect(isTreningAccentId('orange')).toBe(true);
    expect(isTreningAccentId('purple')).toBe(false);
  });

  it('defaults to lime and persists choice', () => {
    expect(readTreningAccent()).toBe(DEFAULT_TRENING_ACCENT);
    writeTreningAccent('teal');
    expect(readTreningAccent()).toBe('teal');
    expect(localStorage.getItem(STORAGE_KEYS.TRENING_ACCENT)).toBe('teal');
  });
});
