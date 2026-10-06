import { fetchMarketChart, normalizeMarketSymbol } from './marketQuoteData.ts';

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
