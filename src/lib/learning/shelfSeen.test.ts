import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSeen, markSeen } from './shelfSeen';

beforeEach(() => localStorage.clear());

describe('shelfSeen', () => {
  it('zapamiętuje obejrzane pozycje osobno dla użytkownika', () => {
    markSeen('u1', ['a', 'b']);
    expect([...loadSeen('u1')]).toEqual(['a', 'b']);
    expect(loadSeen('u2').size).toBe(0);
  });
  it('dokłada do istniejących i nie dubluje', () => {
    markSeen('u1', ['a']);
    markSeen('u1', ['a', 'c']);
    expect([...loadSeen('u1')].sort()).toEqual(['a', 'c']);
  });
  it('uszkodzony zapis nie psuje działania', () => {
    localStorage.setItem('sparky_shelf_seen_u1', '{nie json');
    expect(loadSeen('u1').size).toBe(0);
    localStorage.setItem('sparky_shelf_seen_u1', JSON.stringify([1, 'ok', null]));
    expect([...loadSeen('u1')]).toEqual(['ok']);
  });
  it('zablokowany storage nie rzuca wyjątku', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => markSeen('u1', ['a'])).not.toThrow();
    vi.restoreAllMocks();
  });
  it('pusta lista niczego nie zapisuje', () => {
    markSeen('u1', []);
    expect(localStorage.getItem('sparky_shelf_seen_u1')).toBeNull();
  });
});
