import { fetchMarketChart, normalizeMarketSymbol } from './marketQuoteData.ts';

Deno.test('explicit US listings override GPW aliases and normalize share classes', () => {
  if (normalizeMarketSymbol('CDR.US').symbol !== 'CDR'
    || normalizeMarketSymbol('BRK/B.US').symbol !== 'BRK-B'
    || normalizeMarketSymbol('UHAL.B.US').symbol !== 'UHAL-B')
    throw new Error('An explicit US identity was misinterpreted');
});

Deno.test('long history daily changes use the previous session rather than range baseline', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => Promise.resolve(Response.json({ chart: { result: [{
    meta: { regularMarketPrice: 100, chartPreviousClose: 50, currency: 'USD',
      regularMarketTime: 1791273600, exchangeTimezoneName: 'UTC' },
    timestamp: [1791014400, 1791273600], indicators: { quote: [{ close: [90, 100] }] },
  }] } }));
  try {
    const { quote } = await fetchMarketChart(normalizeMarketSymbol('AAPL.US'), '1y');
    if (quote.prevClose !== 90 || quote.changePct !== 11.11)
      throw new Error('Long-range baseline was reported as the daily change');
  } finally { globalThis.fetch = original; }
});

Deno.test('price history keeps exchange symbols distinct across markets', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => Promise.resolve(Response.json({ chart: { result: [{
    meta: { regularMarketPrice: 10, currency: 'PLN', regularMarketTime: 1791273600 },
    timestamp: [1791273600], indicators: { quote: [{ close: [10] }] },
  }] } }));
  try {
    const polish = await fetchMarketChart(normalizeMarketSymbol('ATT.PL'), '5d');
    const american = await fetchMarketChart(normalizeMarketSymbol('ATT.US'), '5d');
    if (polish.history[0].ticker !== 'ATT.WA' || american.history[0].ticker !== 'ATT')
      throw new Error('Different exchange listings collide in the daily price cache');
    if (polish.quote.ticker !== 'ATT' || polish.quote.symbol !== 'ATT.WA')
      throw new Error('Quote DTO lost its broker-compatible ticker');
  } finally { globalThis.fetch = original; }
});
