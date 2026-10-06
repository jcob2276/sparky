import { orcaSelect } from './superinvestorsApi';
import { shiftDateStr, getTodayWarsaw, formatLongDateWarsaw } from '../date';

export interface GpwShortCompany {
  ticker: string; companyName: string; totalPct: number; publicHoldersCount: number;
  topHolder: string; lastChange: string; isHistorical: boolean; diff14d: number | null;
}
export interface GpwShortsKpis {
  totalCompanies: number; activePositions: number; highestShortPct: number | null;
  highestShortTicker: string | null; lastRegisterChange: string | null;
  activeCount: number; historicalCount: number;
}
export interface Gpw14dMover { ticker: string; name: string; diff14d: number }
export interface GpwShortChartData {
  ticker: string; companyName: string; shortPct: number | null; latestPrice: number | null;
  startDateLabel: string; endDateLabel: string; priceDate: string | null; shortDate: string | null;
  priceSourceUrl: string | null;
  points: { date: string; shortPct: number | null; price: number | null }[];
  reportedPositions: { holder: string; pct: number; date: string; sourceUrl: string }[];
}
interface RawShortAgg {
  company: string; ticker?: string | null; total_pct: number; public_holders: number;
  last_change?: string | null; top_holder?: string | null;
}
interface RawShortsHistory {
  ticker?: string | null; company?: string; position_date: string; total_pct: number | null;
}
interface RawDailyPrice { date: string; close_raw?: number | null; currency?: string | null; source_url?: string | null }
interface RawPositionReport { holder: string; position_pct: number; position_date: string; source_url: string }

export async function fetchGpwShortsData() {
  const [rawAgg, history] = await Promise.all([
    orcaSelect<RawShortAgg>('vw_gpw_shorts_agg?order=total_pct.desc,company.asc', { strict: true }),
    orcaSelect<RawShortsHistory>('vw_knf_shorts_baseline_14d?order=company.asc', { strict: true }),
  ]);
  if (rawAgg.length >= 20000 || history.length >= 20000) throw new Error('Niepełny odczyt historii KNF');
  const cutoff = shiftDateStr(getTodayWarsaw(), -14);
  const companies: GpwShortCompany[] = rawAgg.map((row) => {
    if (!row.company || !Number.isFinite(row.total_pct) || !Number.isInteger(row.public_holders))
      throw new Error('Niepełny agregat KNF');
    const ticker = row.ticker ?? row.company;
    const baseline = history.filter(h => h.company === row.company || (row.ticker && h.ticker === row.ticker))
      .filter(h => h.position_date <= cutoff && h.total_pct != null)
      .sort((a, b) => b.position_date.localeCompare(a.position_date))[0];
    return { ticker, companyName: row.company, totalPct: row.total_pct, publicHoldersCount: row.public_holders,
      topHolder: row.top_holder ?? '—', lastChange: row.last_change ? formatLongDateWarsaw(row.last_change) : '—',
      isHistorical: row.public_holders === 0,
      diff14d: baseline ? Math.round((row.total_pct - baseline.total_pct!) * 100) / 100 : null };
  });
  const active = companies.filter(c => !c.isHistorical);
  const highest = [...active].sort((a, b) => b.totalPct - a.totalPct)[0];
  const latestDate = rawAgg.map(r => r.last_change).filter((date): date is string => Boolean(date)).sort().at(-1) ?? null;
  const movers = companies.filter((c): c is GpwShortCompany & { diff14d: number } => c.diff14d != null)
    .map(c => ({ ticker: c.ticker, name: c.companyName, diff14d: c.diff14d }));
  const kpis: GpwShortsKpis = { totalCompanies: companies.length,
    activePositions: active.reduce((sum, c) => sum + c.publicHoldersCount, 0),
    highestShortPct: highest?.totalPct ?? null, highestShortTicker: highest?.ticker ?? null,
    lastRegisterChange: latestDate, activeCount: active.length, historicalCount: companies.length - active.length };
  return { companies, kpis, increases: movers.filter(m => m.diff14d > 0).sort((a, b) => b.diff14d - a.diff14d).slice(0, 3),
    decreases: movers.filter(m => m.diff14d < 0).sort((a, b) => a.diff14d - b.diff14d).slice(0, 3) };
}

export async function fetchShortVsPriceChart(ticker: string, companyName: string): Promise<GpwShortChartData> {
  const cleanTicker = ticker.toUpperCase().replace(/\.(WA|PL)$/, '').trim();
  const today = getTodayWarsaw();
  const since = shiftDateStr(today, -90);
  const [history, prices, reports] = await Promise.all([
    orcaSelect<RawShortsHistory>(`knf_short_snapshots?company=eq.${encodeURIComponent(companyName)}&observed_date=gte.${since}&observed_date=lte.${today}&order=observed_date.asc&select=company,ticker,position_date:observed_date,total_pct`, { strict: true }),
    orcaSelect<RawDailyPrice>(`prices_daily?or=(ticker.eq.${encodeURIComponent(cleanTicker)},ticker.eq.${encodeURIComponent(cleanTicker)}.WA)&date=gte.${since}&date=lte.${today}&currency=eq.PLN&order=date.asc&select=date,close_raw,currency,source_url`, { strict: true }),
    orcaSelect<RawPositionReport>(`knf_disclosed_positions?company=eq.${encodeURIComponent(companyName)}&position_date=lte.${today}&order=position_date.desc,modify_date.desc.nullslast,external_id.asc&limit=5&select=holder,position_pct,position_date,source_url`, { strict: true }),
  ]);
  if (history.length >= 20000 || prices.length >= 20000) throw new Error('Niepełny odczyt wykresu KNF');
  const known = history.filter(h => h.total_pct != null && Number.isFinite(h.total_pct))
    .sort((a, b) => a.position_date.localeCompare(b.position_date));
  const quoted = prices.filter(p => p.currency === 'PLN' && p.close_raw != null && Number.isFinite(p.close_raw) && p.close_raw > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const dates = [...new Set([...known.filter(h => h.position_date >= since).map(h => h.position_date), ...quoted.map(p => p.date)])].sort();
  let cursor = 0;
  let lastShort: number | null = null;
  const points = dates.map(date => {
    while (cursor < known.length && known[cursor].position_date <= date) lastShort = known[cursor++].total_pct;
    return { date, shortPct: lastShort, price: quoted.find(p => p.date === date)?.close_raw ?? null };
  });
  const lastPrice = quoted.at(-1);
  const lastPosition = known.at(-1);
  return { ticker: cleanTicker, companyName, shortPct: lastPosition?.total_pct ?? null,
    latestPrice: lastPrice?.close_raw ?? null, priceDate: lastPrice?.date ?? null, shortDate: lastPosition?.position_date ?? null,
    priceSourceUrl: lastPrice?.source_url ?? null,
    startDateLabel: dates[0] ? formatLongDateWarsaw(dates[0]) : '—',
    endDateLabel: dates.at(-1) ? formatLongDateWarsaw(dates.at(-1)!) : '—', points,
    reportedPositions: reports.map(r => ({ holder: r.holder, pct: r.position_pct, date: r.position_date, sourceUrl: r.source_url })) };
}
