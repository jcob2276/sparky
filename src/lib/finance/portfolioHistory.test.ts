import { shiftDateStr } from '@vanguard/domain';
import { describe, expect, it } from 'vitest';
import { buildPortfolioSeries, sliceRange, summarizeRange, type PricePoint } from './portfolioHistory';

const p = (ticker: string, date: string, pricePln: number): PricePoint => ({ ticker, date, pricePln });

describe('portfolioHistory', () => {
  it('liczy wartość jako ilość × cena i przenosi ostatnią cenę przez luki w notowaniach', () => {
    const prices = [
      p('AAA', '2026-11-02', 10), p('AAA', '2026-11-03', 12), p('AAA', '2026-11-06', 11),
      p('BTC', '2026-11-02', 100), p('BTC', '2026-11-03', 100), p('BTC', '2026-11-04', 110), p('BTC', '2026-11-05', 120), p('BTC', '2026-11-06', 130),
    ];
    const { points, missing } = buildPortfolioSeries(prices, [{ ticker: 'AAA', quantity: 2 }, { ticker: 'BTC', quantity: 0.5 }]);
    expect(missing).toEqual([]);
    expect(points.map((x) => x.date)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']);
    expect(points.map((x) => x.value)).toEqual([70, 74, 79, 84, 87]);
  });

  it('startuje dopiero, gdy znamy cenę każdej pozycji', () => {
    const prices = [p('AAA', '2026-11-01', 10), p('AAA', '2026-11-04', 10), p('BBB', '2026-11-03', 5), p('BBB', '2026-11-04', 6)];
    const { points } = buildPortfolioSeries(prices, [{ ticker: 'AAA', quantity: 1 }, { ticker: 'BBB', quantity: 1 }]);
    expect(points[0].date).toBe('2026-11-03');
    expect(points[0].value).toBe(15);
  });

  it('pozycje bez żadnej ceny trafiają do missing i nie psują reszty serii', () => {
    const { points, missing } = buildPortfolioSeries([p('AAA', '2026-11-01', 10)], [{ ticker: 'AAA', quantity: 3 }, { ticker: 'ZZZ', quantity: 1 }]);
    expect(missing).toEqual(['ZZZ']);
    expect(points).toEqual([{ date: '2026-11-01', value: 30 }]);
  });

  it('ignoruje pozycje o zerowej ilości i ceny spoza portfela', () => {
    const { points, missing } = buildPortfolioSeries([p('AAA', '2026-11-01', 10), p('OLD', '2026-11-01', 999)], [{ ticker: 'AAA', quantity: 1 }, { ticker: 'OLD', quantity: 0 }]);
    expect(points).toEqual([{ date: '2026-11-01', value: 10 }]);
    expect(missing).toEqual([]);
  });

  it('wycina zakres od ostatniego punktu i liczy zmianę', () => {
    const points = Array.from({ length: 120 }, (_, i) => ({ date: shiftDateStr('2026-07-01', i), value: 100 + i }));
    const month = sliceRange(points, '1M');
    expect(month.length).toBeLessThan(points.length);
    expect(month[month.length - 1]).toEqual(points[points.length - 1]);
    expect(sliceRange(points, 'MAX')).toBe(points);
    const change = summarizeRange(month)!;
    expect(change.change).toBe(month[month.length - 1].value - month[0].value);
    expect(change.pct).toBeGreaterThan(0);
  });

  it('zmiana jest null, gdy brakuje dwóch punktów', () => {
    expect(summarizeRange([])).toBeNull();
    expect(summarizeRange([{ date: '2026-11-01', value: 5 }])).toBeNull();
  });
});
