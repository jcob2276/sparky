import { describe, expect, it } from 'vitest';
import { detectRecurring } from '@vanguard/domain';

const rows = (name: string, dates: string[], amount: number) => dates.map((date) => ({ counterparty: name, amount, date }));

describe('detectRecurring', () => {
  it('wykrywa subskrypcję miesięczną i wylicza następny termin', () => {
    const out = detectRecurring(rows('GOOGLE YOUTUBEPREMIUM  LONDON', ['2026-08-12', '2026-09-12', '2026-10-12'], -19.0));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ cadence: 'monthly', count: 3, typicalAmount: 19, lastDate: '2026-10-12', nextExpected: '2026-11-12', monthlyCost: 19 });
  });

  it('toleruje przesunięcia o kilka dni i drobne zmiany kwoty', () => {
    const out = detectRecurring([
      { counterparty: 'T-MOBILE POLSKA', amount: -45.0, date: '2026-07-03' },
      { counterparty: 'T-MOBILE POLSKA', amount: -45.5, date: '2026-08-05' },
      { counterparty: 'T-MOBILE POLSKA', amount: -44.9, date: '2026-09-04' },
      { counterparty: 'T-MOBILE POLSKA', amount: -45.0, date: '2026-10-03' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].cadence).toBe('monthly');
  });

  it('wykrywa opłatę tygodniową i przelicza ją na miesiąc', () => {
    const out = detectRecurring(rows('WARZYWNIAK ABONAMENT', ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'], -20));
    expect(out[0]).toMatchObject({ cadence: 'weekly', monthlyCost: 86.6 });
  });

  it('zakupy w sklepie o nieregularnych odstępach nie są cykliczne', () => {
    const out = detectRecurring(rows('JMP S.A. BIEDRONKA 309 RZESZOW', ['2026-10-01', '2026-10-02', '2026-10-09', '2026-10-17', '2026-10-30'], -25));
    expect(out).toEqual([]);
  });

  it('grupuje oddziały tego samego sprzedawcy po nazwie bez numerów', () => {
    const out = detectRecurring([
      { counterparty: 'SIŁOWNIA KLUB 12 RZESZOW', amount: -129, date: '2026-08-01' },
      { counterparty: 'SIŁOWNIA KLUB 14 RZESZOW', amount: -129, date: '2026-09-01' },
      { counterparty: 'SIŁOWNIA KLUB 12 RZESZOW', amount: -129, date: '2026-10-01' },
    ]);
    expect(out).toHaveLength(1);
  });

  it('odrzuca zbyt zmienną kwotę, wpływy i mniej niż trzy wystąpienia', () => {
    expect(detectRecurring([
      ...rows('RESTAURACJA X', ['2026-08-01', '2026-09-01', '2026-10-01'], -10),
      { counterparty: 'RESTAURACJA X', amount: -90, date: '2026-11-01' },
    ])).toEqual([]);
    expect(detectRecurring(rows('FIRMA WYPŁATA', ['2026-08-10', '2026-09-10', '2026-10-10'], 5000))).toEqual([]);
    expect(detectRecurring(rows('RZADKI SKLEP', ['2026-08-01', '2026-09-01'], -30))).toEqual([]);
  });

  it('sortuje malejąco po koszcie miesięcznym', () => {
    const out = detectRecurring([
      ...rows('TANIA USLUGA', ['2026-08-01', '2026-09-01', '2026-10-01'], -10),
      ...rows('DROGA USLUGA', ['2026-08-02', '2026-09-02', '2026-10-02'], -200),
    ]);
    expect(out.map((r) => r.monthlyCost)).toEqual([200, 10]);
  });
});
