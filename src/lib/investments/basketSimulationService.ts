import { getTodayWarsaw, shiftDateStr } from '../date';
import { orcaSelect } from './superinvestorsApi';
import { usQuoteSymbol } from './marketSymbol';
import { calculateDisclosureBasket, type BasketPrice } from './basketSimulation';
import type { ListingStatus } from './companyListing';

interface BasketCandidate {
  ticker: string; company_name: string; net_changes: number; total_value: number;
  period_of_report: string; previous_period: string;
}
interface ComparisonSource {
  ticker: string; investor_id: string; period_of_report: string; previous_period: string;
  filing_url: string; previous_filing_url: string; shares_delta: number;
}
interface ReportSource { investor_id: string; period_of_report: string; filing_date: string; filing_url: string }

export async function fetchDisclosureBasket(size: 5 | 10 | 20 = 10) {
  const today = getTodayWarsaw();
  const ranked = await orcaSelect<BasketCandidate>(
    'vw_sec13f_screener?net_changes=gt.0&order=net_changes.desc,total_value.desc,ticker.asc', { strict: true });
  const candidates = ranked.slice(0, size);
  if (candidates.some(c => !/^[A-Z0-9./-]+$/.test(c.ticker))) throw new Error('Nieprawidłowy symbol w danych koszyka.');
  const symbols = candidates.map(c => c.ticker);
  const sources = symbols.length ? await orcaSelect<ComparisonSource>(
    `vw_sec13f_verified_changes?ticker=in.(${encodeURIComponent(symbols.join(','))})&order=ticker.asc,investor_id.asc`,
    { strict: true }) : [];
  const investorIds = [...new Set(sources.map(s => s.investor_id))];
  const periods = [...new Set(sources.flatMap(s => [s.period_of_report, s.previous_period]))];
  const reports = investorIds.length ? await orcaSelect<ReportSource>(
    `vw_sec13f_verified_reports?investor_id=in.(${encodeURIComponent(investorIds.join(','))})&period_of_report=in.(${periods.join(',')})&order=filing_date.asc`,
    { strict: true }) : [];
  const reportByKey = new Map(reports.map(r => [`${r.investor_id}/${r.period_of_report}`, r]));
  const usedReports = new Map<string, ReportSource>();
  for (const candidate of candidates) {
    const comparison = sources.filter(s => s.ticker === candidate.ticker);
    if (comparison.some(s => s.period_of_report !== candidate.period_of_report || s.previous_period !== candidate.previous_period)) {
      throw new Error('Okresy rankingu i raportów różnią się. Odśwież koszyk.');
    }
    const net = comparison.reduce((sum, s) => sum + (s.shares_delta > 0 ? 1 : s.shares_delta < 0 ? -1 : 0), 0);
    if (!comparison.length || net !== candidate.net_changes) throw new Error('Ranking zmienił się podczas odczytu. Odśwież koszyk.');
    for (const source of comparison) {
      for (const period of [source.period_of_report, source.previous_period]) {
        const report = reportByKey.get(`${source.investor_id}/${period}`);
        if (!report || !report.filing_date || report.filing_date > today) throw new Error('Brak daty ujawnienia raportu koszyka.');
        usedReports.set(report.filing_url, report);
      }
    }
  }
  const knownOn = [...usedReports.values()].map(r => r.filing_date).sort().at(-1) ?? null;
  const quoteSymbols = candidates.map(c => usQuoteSymbol(c.ticker));
  const [prices, listings] = knownOn ? await Promise.all([
    orcaSelect<BasketPrice>(`prices_daily?select=ticker,date,close_adj,currency,source_url&ticker=in.(${encodeURIComponent(quoteSymbols.join(','))})&date=gt.${knownOn}&date=lt.${today}&order=date.asc,ticker.asc`, { strict: true }),
    orcaSelect<{ ticker: string; listing_status: ListingStatus }>(
      `companies?select=ticker,listing_status&market=eq.us&ticker=in.(${encodeURIComponent(symbols.join(','))})`, { strict: true }),
  ]) : [[], []];
  if (prices.length >= 20_000) throw new Error('Przekroczono limit danych cenowych koszyka.');
  const names = new Map(candidates.map(c => [usQuoteSymbol(c.ticker), c.ticker]));
  const calculation = calculateDisclosureBasket(symbols, knownOn ?? today,
    prices.map(p => ({ ...p, ticker: names.get(p.ticker) ?? p.ticker })), shiftDateStr(today, -1));
  return {
    ...calculation, candidates, knownOn, requestedSize: size, today,
    period: candidates[0]?.period_of_report ?? null, previousPeriod: candidates[0]?.previous_period ?? null,
    reportSources: [...usedReports.values()],
    listingStatuses: Object.fromEntries(listings.map(l => [l.ticker, l.listing_status])),
  };
}
export type DisclosureBasket = Awaited<ReturnType<typeof fetchDisclosureBasket>>;
