import { describe, expect, it } from 'vitest';
import { leadWindowDays, nextQuietRow, upcomingRows } from './upcoming';
import type { DerivedObligation } from './terminyDerived';
import type { LifeObligation } from '../../lib/lifeObligationsApi';

const row = (id: string, daysLeft: number, lead_offsets: number[]): DerivedObligation => ({
  item: { id, title: id, kind: 'vehicle', lead_offsets } as LifeObligation,
  nextDate: '2026-12-01',
  daysLeft,
  bucket: 'month',
  ringProgress: 0.5,
});

describe('leadWindowDays', () => {
  it('bierze najdalsze wcześniejsze przypomnienie, z limitem i wartością domyślną', () => {
    expect(leadWindowDays([-30, -14, -7])).toBe(30);
    expect(leadWindowDays([0])).toBe(7);
    expect(leadWindowDays([-90])).toBe(45);
  });
});

describe('upcomingRows', () => {
  it('pomija dziś i jutro (baner), pokazuje okno przypomnień i rozróżnia poziomy', () => {
    const rows = [row('jutro', 1, [-7]), row('za-5', 5, [-7]), row('za-20', 20, [-30, -14, -7]), row('za-40', 40, [-30])];
    const result = upcomingRows(rows).map((u) => [u.row.item.id, u.level]);
    expect(result).toEqual([['za-5', 'soon'], ['za-20', 'heads-up']]);
  });
});

describe('nextQuietRow', () => {
  it('zwraca najbliższy termin spoza okna, a gdy wszystko jest w oknie, nic', () => {
    const rows = [row('za-5', 5, [-7]), row('za-100', 100, [-7]), row('za-200', 200, [-7])];
    expect(nextQuietRow(rows)?.item.id).toBe('za-100');
    expect(nextQuietRow([row('za-5', 5, [-7])])).toBeNull();
  });
});
