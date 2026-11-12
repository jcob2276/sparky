import { describe, expect, it } from 'vitest';
import { bankCategoryLabel, summarizeSpending } from './bankSpending';

describe('summarizeSpending', () => {
  it('sumuje obciążenia po kategorii malejąco i liczy udziały', () => {
    const out = summarizeSpending([
      { amount: -30, category: 'zakupy_spozywcze' },
      { amount: -20, category: 'zakupy_spozywcze' },
      { amount: -40, category: 'jedzenie_na_miescie' },
      { amount: -110, category: 'transport' },
    ]);
    expect(out.map((r) => [r.category, r.total])).toEqual([
      ['transport', 110], ['zakupy_spozywcze', 50], ['jedzenie_na_miescie', 40],
    ]);
    expect(out[0].share).toBeCloseTo(0.55);
    expect(out.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1);
  });

  it('pomija wpływy i przelewy własne', () => {
    const out = summarizeSpending([
      { amount: 5000, category: 'wynagrodzenie' },
      { amount: -1295, category: 'przelewy_wlasne' },
      { amount: -10, category: 'inne' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].category).toBe('inne');  // ręcznie wybrane "Inne" zostaje osobno od "Do sprawdzenia"
  });

  it('brak lub nieznana kategoria trafia do "do sprawdzenia"', () => {
    const out = summarizeSpending([{ amount: -5, category: null }, { amount: -7, category: 'wymyslona' }]);
    expect(out).toEqual([expect.objectContaining({ category: 'do_sprawdzenia', total: 12 })]);
  });

  it('puste dane dają pustą listę bez dzielenia przez zero', () => {
    expect(summarizeSpending([])).toEqual([]);
  });
});

describe('bankCategoryLabel', () => {
  it('zwraca polską etykietę, a dla brakującej lub nieznanej "Do sprawdzenia"', () => {
    expect(bankCategoryLabel('transport')).toBe('Transport i paliwo');
    expect(bankCategoryLabel('inne')).toBe('Inne');
    expect(bankCategoryLabel(null)).toBe('Do sprawdzenia');
    expect(bankCategoryLabel('xyz')).toBe('Do sprawdzenia');
  });
});

import { spendingChanges as changesFor } from './bankSpending';
describe('spendingChanges', () => {
  const row = (category: 'zakupy' | 'transport' | 'dom', total: number) => ({ category, label: category, total, share: 0 });
  it('lists only big swings, largest first, including categories that disappeared', () => {
    const out = changesFor([row('zakupy', 300), row('transport', 105)], [row('zakupy', 100), row('transport', 100), row('dom', 80)]);
    expect(out.map(r => [r.category, r.delta])).toEqual([['zakupy', 200], ['dom', -80]]);
  });
});
