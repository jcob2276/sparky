/**
 * quotes.ts — Synchronizacja notowań giełdowych i kursów walut NBP.
 * Pobiera bieżące notowania z Yahoo Finance oraz oficjalne kursy średnie USD/EUR z NBP API.
 */

interface QuoteItem {
  ticker: string;
  symbol: string;
  price: number;
  prevClose: number;
  changePct: number;
  currency: string;
  pricePln: number;
}

interface FxRates {
  usdPln: number;
  eurPln: number;
  date: string;
}

async function fetchNbpFxRates(): Promise<FxRates> {
  try {
    const [usdRes, eurRes] = await Promise.all([
      fetch('https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      }),
      fetch('https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      }),
    ]);

    const usdData = usdRes.ok ? await usdRes.json() : null;
    const eurData = eurRes.ok ? await eurRes.json() : null;

    const usdPln = usdData?.rates?.[0]?.mid ?? 3.8404;
    const eurPln = eurData?.rates?.[0]?.mid ?? 4.375;
    const date = usdData?.rates?.[0]?.effectiveDate ?? new Date().toISOString().slice(0, 10);

    return { usdPln, eurPln, date };
  } catch (err) {
    console.warn('[quotes] NBP API error, using safe fallback rates:', err);
    return { usdPln: 3.8404, eurPln: 4.375, date: new Date().toISOString().slice(0, 10) };
  }
}

function normalizeTickerToYahoo(raw: string): { ticker: string; symbol: string } {
  const t = raw.trim().toUpperCase();
  if (t === 'CDR' || t === 'CDR.WA') return { ticker: 'CDR', symbol: 'CDR.WA' };
  if (t === 'JEDI' || t === 'JEDI.DE') return { ticker: 'JEDI', symbol: 'JEDI.DE' };
  if (t === 'SXR8' || t === 'SXR8.DE') return { ticker: 'SXR8', symbol: 'SXR8.DE' };
  if (t === 'MRVL' || t === 'MRVL.US') return { ticker: 'MRVL', symbol: 'MRVL' };
  return { ticker: t.replace(/\.(WA|DE|AS|US)$/, ''), symbol: t };
}

async function fetchYahooQuote(symbol: string): Promise<{ price: number; prevClose: number; currency: string } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta || meta.regularMarketPrice == null) return null;

    return {
      price: meta.regularMarketPrice,
      prevClose: meta.chartPreviousClose ?? meta.regularMarketPrice,
      currency: (meta.currency || 'USD').toUpperCase(),
    };
  } catch (err) {
    console.warn(`[quotes] Error fetching Yahoo quote for ${symbol}:`, err);
    return null;
  }
}

export async function runQuotesSync(req: Request): Promise<unknown> {
  const url = new URL(req.url);
  const body = (req.method === 'POST' || req.method === 'PUT')
    ? await req.clone().json().catch(() => ({}))
    : {};

  const rawTickers: string[] = Array.isArray(body.tickers)
    ? body.tickers
    : url.searchParams.get('tickers')
      ? url.searchParams.get('tickers')!.split(',').filter(Boolean)
      : ['CDR.WA', 'MRVL', 'JEDI.DE', 'SXR8.DE'];

  // 1. Kursy walut z NBP
  const rates = await fetchNbpFxRates();

  // 2. Pobieranie notowań z Yahoo Finance
  const items = rawTickers.map(normalizeTickerToYahoo);
  const quotesResults = await Promise.all(
    items.map(async ({ ticker, symbol }) => {
      const q = await fetchYahooQuote(symbol);
      if (!q) return null;

      let pricePln = q.price;
      if (q.currency === 'USD') {
        pricePln = Math.round(q.price * rates.usdPln * 100) / 100;
      } else if (q.currency === 'EUR') {
        pricePln = Math.round(q.price * rates.eurPln * 100) / 100;
      } else {
        pricePln = Math.round(q.price * 100) / 100;
      }

      const changePct = q.prevClose > 0
        ? Math.round(((q.price - q.prevClose) / q.prevClose) * 10000) / 100
        : 0;

      const item: QuoteItem = {
        ticker,
        symbol,
        price: Math.round(q.price * 100) / 100,
        prevClose: Math.round(q.prevClose * 100) / 100,
        changePct,
        currency: q.currency,
        pricePln,
      };

      return item;
    })
  );

  const quotes: Record<string, QuoteItem> = {};
  for (const item of quotesResults) {
    if (item) {
      quotes[item.ticker] = item;
      quotes[item.symbol] = item;
    }
  }

  return {
    ok: true,
    rates,
    quotes,
    timestamp: new Date().toISOString(),
  };
}
