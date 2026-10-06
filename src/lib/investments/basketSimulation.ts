import { shiftDateStr } from '../date';

export interface BasketPrice {
  ticker: string; date: string; close_adj: number | string | null; currency: string | null; source_url: string | null;
}
export interface BasketPoint { date: string; returnPct: number }
export interface SimulatedPosition {
  ticker: string; baselinePrice: number; latestPrice: number; returnPct: number;
  initialWeightPct: number; baselineSourceUrl: string; latestSourceUrl: string;
}
export interface BasketCalculation {
  points: BasketPoint[]; positions: SimulatedPosition[]; missingTickers: string[]; reason: string | null;
}
/** Equal initial dollar amounts, fixed adjusted-price units, common dates only. */
export function calculateDisclosureBasket(tickers: string[], disclosedOn: string, prices: BasketPrice[], today: string): BasketCalculation {
  const result: BasketCalculation = { points: [], positions: [], missingTickers: [], reason: null };
  if (!tickers.length) return { ...result, reason: 'Brak zweryfikowanych pozycji do symulacji.' };
  const earliest = shiftDateStr(disclosedOn, 1);
  const series = new Map(tickers.map(ticker => [ticker, new Map<string, BasketPrice>()]));
  for (const row of prices) {
    if (!series.has(row.ticker) || row.date < earliest || row.date > today || row.currency !== 'USD'
      || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !Number.isFinite(Date.parse(row.date))
      || !row.source_url?.startsWith('https://') || row.close_adj === null || row.close_adj === ''
      || !Number.isFinite(Number(row.close_adj)) || Number(row.close_adj) <= 0) continue;
    series.get(row.ticker)!.set(row.date, row);
  }
  result.missingTickers = tickers.filter(ticker => !series.get(ticker)!.size);
  if (result.missingTickers.length) return { ...result, reason: 'Brak cen skorygowanych dla całego koszyka.' };
  const dates = [...series.get(tickers[0])!.keys()].filter(date => tickers.every(ticker => series.get(ticker)!.has(date))).sort();
  const baselineDate = dates[0];
  if (!baselineDate || baselineDate > shiftDateStr(disclosedOn, 7)) {
    return { ...result, reason: 'Brak wspólnych cen na początku okresu po ujawnieniu.' };
  }
  if (dates.length < 2) return { ...result, reason: 'Potrzebne są co najmniej dwa wspólne dni wyceny.' };
  result.points = dates.map(date => ({
    date, returnPct: (tickers.reduce((sum, ticker) => sum + Number(series.get(ticker)!.get(date)!.close_adj)
      / Number(series.get(ticker)!.get(baselineDate)!.close_adj), 0) / tickers.length - 1) * 100,
  }));
  const lastDate = dates.at(-1)!;
  result.positions = tickers.map(ticker => {
    const baseline = series.get(ticker)!.get(baselineDate)!, latest = series.get(ticker)!.get(lastDate)!;
    return { ticker, baselinePrice: Number(baseline.close_adj), latestPrice: Number(latest.close_adj),
      returnPct: (Number(latest.close_adj) / Number(baseline.close_adj) - 1) * 100,
      initialWeightPct: 100 / tickers.length, baselineSourceUrl: baseline.source_url!, latestSourceUrl: latest.source_url! };
  });
  return result;
}
