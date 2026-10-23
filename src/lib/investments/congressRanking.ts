/**
 * congressRanking.ts — ranking polityków z samych ujawnień STOCK Act (bez cen).
 * Alfa vs S&P 500 wymaga cen wszystkich spółek z ujawnień; baza ma je tylko dla części
 * tickerów, więc ranking opiera się na aktywności i widełkach kwot, nie na zwrocie.
 */

export interface CongressRankingRow {
  id: string;
  name: string;
  bioguideId?: string | null;
  chamber: string;
  party: string;
  state: string;
  tradesCount: number;
  buysCount: number;
  sellsCount: number;
  volumeLowUsd: number;
  volumeHighUsd: number;
  volumeMidUsd: number;
  lastDisclosureDate: string;
}

export interface RankingTradeInput {
  key: string;
  name: string;
  bioguideId?: string | null;
  chamber: string;
  party: string;
  state: string;
  type: 'buy' | 'sell' | 'exchange' | 'other';
  amountLow: number;
  amountHigh: number;
  disclosureDate: string;
}

export function buildCongressRankings(trades: RankingTradeInput[]): CongressRankingRow[] {
  const map = new Map<string, CongressRankingRow>();
  for (const t of trades) {
    const row = map.get(t.key) ?? {
      id: t.key, name: t.name, bioguideId: t.bioguideId, chamber: t.chamber, party: t.party, state: t.state,
      tradesCount: 0, buysCount: 0, sellsCount: 0, volumeLowUsd: 0, volumeHighUsd: 0, volumeMidUsd: 0,
      lastDisclosureDate: '',
    };
    row.tradesCount++;
    if (t.type === 'buy') row.buysCount++;
    if (t.type === 'sell') row.sellsCount++;
    row.volumeLowUsd += t.amountLow;
    row.volumeHighUsd += t.amountHigh || t.amountLow;
    row.volumeMidUsd += ((t.amountLow || 0) + (t.amountHigh || t.amountLow || 0)) / 2;
    if (t.disclosureDate > row.lastDisclosureDate) row.lastDisclosureDate = t.disclosureDate;
    map.set(t.key, row);
  }
  return [...map.values()].sort((a, b) => b.tradesCount - a.tradesCount || b.volumeMidUsd - a.volumeMidUsd);
}
