interface Instrument { ticker: string; symbol: string }

export function normalizeMarketSymbol(raw: string): Instrument {
  const t = raw.trim().toUpperCase();
  if (['ISAC', 'SSAC', 'IUSQ', 'IUSQ.DE'].includes(t)) return { ticker: 'ISAC', symbol: 'IUSQ.DE' };
  const symbol = t.endsWith('.US') ? t.slice(0, -3)
    : t.endsWith('.PL') ? `${t.slice(0, -3)}.WA`
    : t.endsWith('.UK') ? `${t.slice(0, -3)}.L`
    : ['CDR', 'ASB', 'ALE', 'XTB'].includes(t) ? `${t}.WA`
    : ['JEDI', 'SXR8'].includes(t) ? `${t}.DE` : t;
  return { ticker: symbol.replace(/\.(WA|DE|AS|L)$/, ''), symbol };
}

function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function optionalNumber(value: unknown, divisor = 1): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value / divisor : null;
}

export async function fetchMarketChart(instrument: Instrument, range: string) {
  const sourceUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(instrument.symbol)}?interval=1d&range=${range}`;
  const response = await fetch(sourceUrl, {
    headers: { 'User-Agent': 'Sparky/1.0 market data', Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`${instrument.symbol}: HTTP ${response.status}`);
  const payload = await response.json();
  const chart = payload?.chart?.result?.[0];
  const meta = chart?.meta;
  if (payload?.chart?.error || !positive(meta?.regularMarketPrice)
    || !positive(meta?.regularMarketTime) || typeof meta?.currency !== 'string'
    || !/^[A-Z]{3}$/.test(meta.currency.toUpperCase()))
    throw new Error(`${instrument.symbol}: brak ceny, waluty lub daty źródłowej`);
  const divisor = meta.currency === 'GBp' || meta.currency === 'GBX' ? 100 : 1;
  const currency = divisor === 100 ? 'GBP' : meta.currency.toUpperCase();
  const quoteAsOf = new Date(meta.regularMarketTime * 1000).toISOString();
  const price = meta.regularMarketPrice / divisor;
  const prevClose = positive(meta.chartPreviousClose) ? meta.chartPreviousClose / divisor : null;
  const quote = { ...instrument, price, prevClose, currency, quoteAsOf,
    changePct: prevClose == null ? null : Math.round((price / prevClose - 1) * 10000) / 100,
    source: 'yahoo_chart', sourceUrl };
  const values = chart.indicators?.quote?.[0];
  const adjusted = chart.indicators?.adjclose?.[0]?.adjclose;
  const history: Record<string, unknown>[] = [];
  const dates = new Set<string>();
  for (let i = 0; i < (chart.timestamp?.length ?? 0); i++) {
    if (!positive(chart.timestamp[i]) || !positive(values?.close?.[i])) continue;
    const at = new Date(chart.timestamp[i] * 1000);
    const date = meta.exchangeTimezoneName
      ? new Intl.DateTimeFormat('en-CA', { timeZone: meta.exchangeTimezoneName,
        year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)
      : at.toISOString().slice(0, 10);
    if (dates.has(date)) continue;
    dates.add(date);
    history.push({ ticker: instrument.symbol, date,
      close_raw: values.close[i] / divisor,
      // Unknown adjustment stays NULL; raw close is not a total-return series.
      close_adj: positive(adjusted?.[i]) ? adjusted[i] / divisor : null,
      open: optionalNumber(values?.open?.[i], divisor), high: optionalNumber(values?.high?.[i], divisor),
      low: optionalNumber(values?.low?.[i], divisor), volume: optionalNumber(values?.volume?.[i]),
      currency, source: quote.source, source_url: sourceUrl, quote_asof: quoteAsOf,
      updated_at: new Date().toISOString() });
  }
  return { quote, history };
}
