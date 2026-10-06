import { requireServiceRole } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { convertCurrency, fetchGpwFxTable } from './gpwFundamentalsFx.ts';
import { fetchMarketChart, normalizeMarketSymbol } from './marketQuoteData.ts';

/** Public requests may read quotes; only a service job may change the shared cache. */
export async function runQuotesSync(req: Request): Promise<unknown> {
  const url = new URL(req.url);
  const body = ['POST', 'PUT'].includes(req.method)
    ? await req.clone().json().catch(() => ({})) : {};
  if (body.persist === true) {
    const denied = requireServiceRole(req);
    if (denied) return denied;
  }
  const raw = Array.isArray(body.tickers) ? body.tickers
    : url.searchParams.get('tickers')?.split(',') ?? ['CDR.WA', 'MRVL', 'JEDI.DE', 'SXR8.DE'];
  if (!raw.length || raw.length > 30 || raw.some((t: unknown) => typeof t !== 'string'
    || !/^[A-Za-z0-9^][A-Za-z0-9.^=-]{0,24}$/.test(t))) {
    throw new Error('Podaj od 1 do 30 poprawnych symboli instrumentów');
  }
  const range = body.range ?? '1mo';
  if (!['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'max'].includes(range))
    throw new Error('Niepoprawny zakres historii notowań');
  const fx = await fetchGpwFxTable();
  const instruments = Array.from(new Map<string, ReturnType<typeof normalizeMarketSymbol>>(raw.map((t: string) => {
    const item = normalizeMarketSymbol(t);
    return [item.symbol, item] as const;
  })).values());
  const results = await Promise.allSettled(instruments.map(async (instrument) => {
    const data = await fetchMarketChart(instrument, range);
    const pricePln = convertCurrency(data.quote.price, data.quote.currency, 'PLN', fx);
    if (pricePln == null || !Number.isFinite(pricePln))
      throw new Error(`NBP nie udostępnia kursu ${data.quote.currency}`);
    return { ...data, quote: { ...data.quote, pricePln: Math.round(pricePln * 100) / 100 } };
  }));
  const successful = results.flatMap((r) => r.status === 'fulfilled' ? [r.value] : []);
  const errors = results.flatMap((r, i) => r.status === 'rejected'
    ? [{ symbol: instruments[i].symbol, message: String(r.reason instanceof Error ? r.reason.message : r.reason) }] : []);
  if (!successful.length) throw new Error(`Nie pobrano notowań: ${errors.map((e) => e.message).join('; ')}`);
  if (body.persist === true) {
    const db = createServiceClient();
    const history = successful.flatMap((r) => r.history);
    if (history.length) {
      const { error } = await db.from('prices_daily').upsert(history, { onConflict: 'ticker,date' });
      if (error) throw new Error(`Zapis historii cen: ${error.message}`);
    }
    const { error } = await db.from('market_quotes').upsert(successful.map(({ quote }) => ({
      symbol: quote.symbol, ticker: quote.ticker, price: quote.price,
      previous_close: quote.prevClose, currency: quote.currency, quote_asof: quote.quoteAsOf,
      fetched_at: new Date().toISOString(), source: quote.source, source_url: quote.sourceUrl,
    })), { onConflict: 'symbol' });
    if (error) throw new Error(`Zapis notowań: ${error.message}`);
  }
  const quotes = Object.fromEntries(successful.flatMap(({ quote }) =>
    [[quote.ticker, quote], [quote.symbol, quote]]));
  return { ok: errors.length === 0, partial: errors.length > 0, errors, quotes,
    rates: { usdPln: fx.rates.get('USD'), eurPln: fx.rates.get('EUR'), date: fx.date },
    timestamp: new Date().toISOString(), persisted: body.persist === true };
}
