import { orcaSelect } from './superinvestorsApi';
import { getTodayWarsaw, shiftDateStr, formatShortMonthLabel } from '../date';
import { watchlistTickersForMarket } from './marketSymbol';

export interface DashboardSourceStatus {
  source: string; checked_at: string | null; last_success_at: string | null;
  latest_disclosure_date: string | null; status: 'ok' | 'partial' | 'error'; error: string | null;
}
export interface DashboardData {
  topConsensus: { ticker: string; net: number } | null;
  maxShort: { company: string; ticker: string; totalPct: number; delta14d: number | null } | null;
  congress14: { total: number; sales: number; buys: number } | null;
  watchlist14Count: number | null;
  activity14d: {
    total: number; peakDateLabel: string | null;
    sources: { politicians: number | null; funds: number | null; insiders: number | null; shorts: number | null };
    days: Array<{ date: string; label: string; politicians: number; funds: number; insiders: number; shorts: number; total: number }>;
  };
  streamItems: Array<{ id: string; dateLabel: string; sourceType: 'FORM 4' | 'KNF' | 'STOCK'; ticker: string; description: string; amountOrPercent: string; sourceUrl?: string }>;
  topConvergenceUsa: Array<{ ticker: string; name: string; fundsNet: number }>;
  topGpwShorts: Array<{ ticker: string; company: string; totalPct: number; holders: number | null }>;
  sourceStatuses: DashboardSourceStatus[];
  issues: string[];
  fetchedAt: string;
}
interface Consensus { ticker?: string; company_name?: string; net_changes?: number | null }
interface ShortAgg { company?: string; ticker?: string; total_pct?: number | null; public_holders?: number | null }
interface Trade { id: string; filer_name?: string; ticker?: string; transaction_type?: string; disclosure_date?: string; amount_label?: string; source_url?: string }
interface Insider { id: string; ticker?: string; transaction_code?: string; filing_date?: string; filer_name?: string; doc_url?: string }
interface ShortPosition { external_id: string; company?: string; ticker?: string; holder?: string; position_pct?: number; position_date?: string }
interface Filing { filing_date?: string }

/** A zero means a successful empty read; null means this source could not be read. */
export async function fetchDashboardData(watchlist: string[] = []): Promise<DashboardData> {
  const today = getTodayWarsaw();
  const since = shiftDateStr(today, -13);
  const issues: string[] = [];
  async function read<T>(label: string, query: string): Promise<T[] | null> {
    try {
      const rows = await orcaSelect<T>(query, { strict: true });
      if (rows.length >= 20_000) issues.push(`${label}: limit odczytu 20 000; liczby mogą być niepełne`);
      return rows;
    } catch (error) {
      issues.push(`${label}: ${error instanceof Error ? error.message : 'błąd odczytu'}`);
      return null;
    }
  }
  const [consensus, shorts, trades, insiders, positions, filings, statuses] = await Promise.all([
    read<Consensus>('13F', 'vw_sec13f_screener?select=ticker,company_name,net_changes&compared_funds=gt.0&order=net_changes.desc.nullslast&limit=5'),
    read<ShortAgg>('KNF agregaty', 'vw_gpw_shorts_agg?order=total_pct.desc.nullslast&limit=3'),
    read<Trade>('Kongres', `stock_act_trades?disclosure_date=gte.${since}&disclosure_date=lte.${today}&order=disclosure_date.desc,id.asc`),
    read<Insider>('Form 4', `vw_sec_form4_public?select=id,ticker,transaction_code,filing_date,filer_name,doc_url&is_derivative=eq.false&form_type=eq.4&transaction_code=in.(P,S)&filing_date=gte.${since}&filing_date=lte.${today}&order=filing_date.desc,id.asc`),
    read<ShortPosition>('KNF zdarzenia', `knf_disclosed_positions?position_date=gte.${since}&position_date=lte.${today}&order=position_date.desc,external_id.asc`),
    read<Filing>('13F zgłoszenia', `filings?filing_date=gte.${since}&filing_date=lte.${today}&order=filing_date.desc,id.asc`),
    read<DashboardSourceStatus>('Monitor źródeł', 'investment_source_status?order=source.asc'),
  ]);
  const inWindow = (date?: string) => Boolean(date && date.slice(0, 10) >= since && date.slice(0, 10) <= today);
  const congressRows = (trades ?? []).filter(r => inWindow(r.disclosure_date));
  const insiderRows = (insiders ?? []).filter(r => inWindow(r.filing_date));
  const shortRows = (positions ?? []).filter(r => inWindow(r.position_date));
  const filingRows = (filings ?? []).filter(r => inWindow(r.filing_date));
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = shiftDateStr(since, i);
    const politicians = congressRows.filter(r => r.disclosure_date?.slice(0, 10) === date).length;
    const ins = insiderRows.filter(r => r.filing_date?.slice(0, 10) === date).length;
    const short = shortRows.filter(r => r.position_date?.slice(0, 10) === date).length;
    const funds = filingRows.filter(r => r.filing_date?.slice(0, 10) === date).length;
    return { date, label: formatShortMonthLabel(date), politicians, insiders: ins, shorts: short, funds, total: politicians + ins + short + funds };
  });
  const peak = days.reduce((best, day) => day.total > best.total ? day : best, days[0]);
  const top = (consensus ?? []).find(r => r.ticker && r.net_changes != null);
  const max = (shorts ?? []).find(r => r.company && r.total_pct != null);
  const stream: Array<DashboardData['streamItems'][number] & { date: string }> = [
    ...insiderRows.map(r => ({ id: `form4_${r.id}`, date: r.filing_date!, dateLabel: formatShortMonthLabel(r.filing_date!), sourceType: 'FORM 4' as const, ticker: r.ticker ?? '—', description: `${r.filer_name ?? 'Insider'}: ${r.transaction_code === 'P' ? 'Kupno (P)' : 'Sprzedaż (S)'}`, amountOrPercent: '—', sourceUrl: r.doc_url })),
    ...shortRows.map(r => ({ id: `knf_${r.external_id}`, date: r.position_date!, dateLabel: formatShortMonthLabel(r.position_date!), sourceType: 'KNF' as const, ticker: r.ticker ?? r.company ?? '—', description: `Pozycja: ${r.holder ?? 'podmiot nieznany'}`, amountOrPercent: r.position_pct == null ? '—' : `${r.position_pct.toFixed(2)}%` })),
    ...congressRows.map(r => ({ id: `stock_${r.id}`, date: r.disclosure_date!, dateLabel: formatShortMonthLabel(r.disclosure_date!), sourceType: 'STOCK' as const, ticker: r.ticker ?? '—', description: `${r.filer_name ?? 'Kongres'}: ${r.transaction_type ?? 'typ nieznany'}`, amountOrPercent: r.amount_label ?? '—', sourceUrl: r.source_url })),
  ];
  const watchedUs = watchlistTickersForMarket(watchlist, 'USA');
  const watchedGpw = watchlistTickersForMarket(watchlist, 'GPW');
  return {
    topConsensus: top ? { ticker: top.ticker!, net: top.net_changes! } : null,
    maxShort: max ? { company: max.company!, ticker: max.ticker ?? max.company!, totalPct: max.total_pct!, delta14d: null } : null,
    congress14: trades === null ? null : { total: congressRows.length, sales: congressRows.filter(r => /sell|sale/i.test(r.transaction_type ?? '')).length, buys: congressRows.filter(r => /buy|purchase/i.test(r.transaction_type ?? '')).length },
    watchlist14Count: [trades, insiders, positions].some(r => r === null) ? null : stream.filter(r => (r.sourceType === 'KNF' ? watchedGpw : watchedUs).has(r.ticker.toUpperCase())).length,
    activity14d: { total: days.reduce((sum, d) => sum + d.total, 0), peakDateLabel: peak.total ? peak.label : null, days,
      sources: { politicians: trades === null ? null : congressRows.length, insiders: insiders === null ? null : insiderRows.length, shorts: positions === null ? null : shortRows.length, funds: filings === null ? null : filingRows.length } },
    streamItems: stream.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15),
    topConvergenceUsa: (consensus ?? []).filter(r => r.ticker && r.net_changes != null).map(r => ({ ticker: r.ticker!, name: r.company_name ?? r.ticker!, fundsNet: r.net_changes! })),
    topGpwShorts: (shorts ?? []).filter(r => r.company && r.total_pct != null).map(r => ({ ticker: r.ticker ?? r.company!, company: r.company!, totalPct: r.total_pct!, holders: r.public_holders ?? null })),
    sourceStatuses: statuses ?? [], issues, fetchedAt: new Date().toISOString(),
  };
}
