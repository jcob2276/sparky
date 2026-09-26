import { orcaSelect } from './superinvestorsApi';

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export interface BacktestPoint {
  asof: string;
  cumulativePct: number;
  periodPct: number;
  funds: number;
}

export async function fetchBasketBacktest(): Promise<BacktestPoint[]> {
  const rows = await orcaSelect<{
    asof?: string;
    cumulative?: number | string;
    ret?: number | string;
    n_funds?: number | string;
  }>(
    'convergence_backtest?select=asof,cumulative,ret,n_funds&kind=eq.basket&ticker=eq.__PORTFEL__&order=asof.asc&limit=80',
  );
  return rows.flatMap((row) => {
    const cumulative = num(row.cumulative);
    if (!row.asof || cumulative == null) return [];
    return [{
      asof: row.asof,
      cumulativePct: cumulative * 100,
      periodPct: (num(row.ret) ?? 0) * 100,
      funds: num(row.n_funds) ?? 0,
    }];
  });
}

export interface GpwFundamental {
  ticker: string;
  name: string;
  sector: string;
  mcap: number | null;
  pe: number | null;
  ps: number | null;
  pb: number | null;
  divYield: number | null;
  roe: number | null;
  netMargin: number | null;
  revenueYoy: number | null;
  lastPeriodEnd: string;
}

export async function fetchGpwFundamentals(): Promise<GpwFundamental[]> {
  const rows = await orcaSelect<{
    ticker?: string | null;
    name?: string | null;
    sector?: string | null;
    mcap?: number | string | null;
    pe?: number | string | null;
    ps?: number | string | null;
    pb?: number | string | null;
    div_yield?: number | string | null;
    roe?: number | string | null;
    net_margin?: number | string | null;
    revenue_yoy?: number | string | null;
    last_period_end?: string | null;
  }>(
    'gpw_fin_public_teaser?select=ticker,name,sector,mcap,pe,ps,pb,div_yield,roe,net_margin,revenue_yoy,last_period_end&order=ticker.asc&limit=500',
  );
  return rows.flatMap((row) => {
    if (!row.ticker) return [];
    return [{
      ticker: row.ticker,
      name: row.name || row.ticker,
      sector: row.sector || '',
      mcap: num(row.mcap),
      pe: num(row.pe),
      ps: num(row.ps),
      pb: num(row.pb),
      divYield: num(row.div_yield),
      roe: num(row.roe),
      netMargin: num(row.net_margin),
      revenueYoy: num(row.revenue_yoy),
      lastPeriodEnd: row.last_period_end || '',
    }];
  });
}

export interface GpwPeriod {
  label: string;
  revenue: number | null;
  netIncome: number | null;
  periodEnd: string;
}

export async function fetchGpwPeriods(ticker: string): Promise<GpwPeriod[]> {
  const safe = ticker.replace(/[^A-Za-z0-9.]/g, '').toUpperCase();
  if (!safe) return [];
  const rows = await orcaSelect<{ quarters8?: unknown }>(
    `gpw_fin_public_teaser?select=quarters8&ticker=eq.${encodeURIComponent(safe)}&limit=1`,
  );
  const raw = rows[0]?.quarters8;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const period = item as { label?: unknown; revenue?: unknown; net_income?: unknown; period_end?: unknown };
    const label = typeof period.label === 'string' ? period.label : '';
    if (!label) return [];
    return [{
      label,
      revenue: num(period.revenue),
      netIncome: num(period.net_income),
      periodEnd: typeof period.period_end === 'string' ? period.period_end : '',
    }];
  });
}

export interface EspiReport {
  id: string;
  ticker: string;
  company: string;
  title: string;
  reportDate: string;
  sourceUrl: string;
  category: string;
}

export async function fetchEspiReports(query: string): Promise<EspiReport[]> {
  const needle = query.replace(/[%_(),*]/g, '').trim();
  const filter = needle
    ? `&or=(ticker.ilike.*${encodeURIComponent(needle)}*,company.ilike.*${encodeURIComponent(needle)}*,title.ilike.*${encodeURIComponent(needle)}*)`
    : '';
  const rows = await orcaSelect<{
    id?: number | string;
    ticker?: string | null;
    company?: string | null;
    title?: string | null;
    report_date?: string | null;
    source_url?: string | null;
    category?: string | null;
  }>(
    `vw_gpw_espi_public?select=id,ticker,company,title,report_date,source_url,category&order=report_date.desc${filter}&limit=80`,
  );
  return rows.map((row) => ({
    id: String(row.id ?? ''),
    ticker: row.ticker || '',
    company: row.company || '',
    title: row.title || '',
    reportDate: row.report_date ? row.report_date.slice(0, 10) : '',
    sourceUrl: row.source_url || '',
    category: row.category || '',
  }));
}

export interface QuotePoint {
  date: string;
  close: number;
}

export async function fetchQuote(ticker: string, from: string): Promise<QuotePoint[]> {
  const safe = ticker.replace(/[^A-Za-z0-9.]/g, '').toUpperCase();
  const start = from.slice(0, 10);
  if (!safe || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return [];
  const rows = await orcaSelect<{ date?: string; close_adj?: number | string }>(
    `prices_daily?select=date,close_adj&ticker=eq.${encodeURIComponent(safe)}&date=gte.${start}&order=date.asc&limit=1500`,
  );
  return rows.flatMap((row) => {
    const close = num(row.close_adj);
    if (!row.date || close == null) return [];
    return [{ date: row.date, close }];
  });
}

export interface AlphaPrint {
  ticker: string;
  tradeDate: string;
  side: string;
  stockPct: number | null;
  spyPct: number | null;
}

function closeOnOrAfter(series: QuotePoint[], day: string): number | null {
  const hit = series.find((point) => point.date >= day);
  return hit?.close ?? series.at(-1)?.close ?? null;
}

export async function alphaForTrades(
  trades: { ticker: string | null; transaction_date: string | null; transaction_type: string | null }[],
): Promise<AlphaPrint[]> {
  const picked = trades.filter((trade) => trade.ticker && trade.transaction_date).slice(0, 8);
  const earliest = picked.map((trade) => trade.transaction_date ?? '').sort()[0];
  if (!earliest) return [];
  const tickers = [...new Set(picked.map((trade) => (trade.ticker ?? '').toUpperCase()))];
  const seriesList = await Promise.all(tickers.map((ticker) => fetchQuote(ticker, earliest)));
  const spy = await fetchQuote('SPY', earliest);
  const byTicker = new Map(tickers.map((ticker, index) => [ticker, seriesList[index] ?? []]));
  const spyLast = spy.at(-1)?.close ?? null;
  return picked.map((trade) => {
    const ticker = (trade.ticker ?? '').toUpperCase();
    const series = byTicker.get(ticker) ?? [];
    const day = trade.transaction_date ?? '';
    const entry = closeOnOrAfter(series, day);
    const last = series.at(-1)?.close ?? null;
    const spyEntry = closeOnOrAfter(spy, day);
    return {
      ticker,
      tradeDate: day,
      side: trade.transaction_type || '',
      stockPct: entry && last ? ((last - entry) / entry) * 100 : null,
      spyPct: spyEntry && spyLast ? ((spyLast - spyEntry) / spyEntry) * 100 : null,
    };
  });
}
