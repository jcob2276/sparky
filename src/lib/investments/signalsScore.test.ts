import { describe, expect, it } from 'vitest';
import { rankDisclosureSignals, type SignalMetrics } from './signalsScore';

function row(partial: Partial<SignalMetrics> & Pick<SignalMetrics, 'ticker'>): SignalMetrics {
  return {
    companyName: partial.ticker,
    fundNetBuyers: 0,
    holders: 1,
    polBuys: 0,
    polSells: 0,
    politicianBuyers: 0,
    politicians: 0,
    insiderBuys: 0,
    buyVolumeMid: 0,
    lastTradeDate: null,
    ...partial,
  };
}

describe('rankDisclosureSignals', () => {
  it('returns nothing when there are no disclosures', () => {
    expect(rankDisclosureSignals([], false)).toEqual([]);
  });

  it('ranks a ticker with more buying sources above a quieter one', () => {
    const ranked = rankDisclosureSignals(
      [
        row({ ticker: 'QUIET', fundNetBuyers: 1, polBuys: 1, politicianBuyers: 1, politicians: 1 }),
        row({
          ticker: 'LOUD',
          fundNetBuyers: 6,
          polBuys: 4,
          polSells: 1,
          politicianBuyers: 3,
          politicians: 3,
          insiderBuys: 2,
          buyVolumeMid: 500_000,
        }),
      ],
      true,
    );
    expect(ranked[0]?.ticker).toBe('LOUD');
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
    expect(ranked[0]?.convergent).toBe(true);
    expect(ranked[0]?.summary).toContain('6 funduszy netto kupuje');
  });

  it('does not mark sales-only politician flow as convergent', () => {
    const ranked = rankDisclosureSignals(
      [row({ ticker: 'SOLD', fundNetBuyers: -2, polSells: 3, politicians: 2 })],
      false,
    );
    expect(ranked[0]?.convergent).toBe(false);
    expect(ranked[0]?.summary).toContain('netto sprzedaje');
  });
});
