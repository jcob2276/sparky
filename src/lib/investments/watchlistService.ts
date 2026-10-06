import { orcaSelect } from './superinvestorsApi';
import { summarizeCompanyPrices, type CompanyPriceRow } from './companyPriceHistory';
import { usQuoteSymbol } from './marketSymbol';
import { isListingInactive, type CompanyListing, type ListingStatus } from './companyListing';
import { getTodayWarsaw, shiftDateStr } from '../date';
export { searchWatchlistCompanies, resolveWatchlistTicker } from './watchlistSearch';

export interface WatchlistItem extends CompanyListing {
  ticker: string; name: string; market: 'USA' | 'GPW'; price: string;
  priceDate?: string | null; priceSourceUrl?: string | null;
  changePercent: number | null; signalsCount: number | null;
  lastSignal: string; sparkline?: number[]; signalSourceUrls?: string[];
}
export interface SearchCompanyResult {
  ticker: string; name: string; market: 'USA' | 'GPW'; sector?: string | null;
}
interface CompanyRow {
  ticker: string; name?: string; listing_status?: ListingStatus;
  listing_status_date?: string; listing_source_url?: string;
}
interface ConsensusRow {
  ticker: string; company_name?: string; net_changes?: number | null;
  reported_increases?: number; reported_decreases?: number; compared_funds?: number;
  period_of_report?: string; previous_period?: string; source_urls?: string[];
}
interface ShortRow { ticker: string; total_pct?: number; public_holders?: number | null }
interface PriceRow extends CompanyPriceRow { ticker: string }

export async function fetchWatchlistDetails(tickers: string[]): Promise<WatchlistItem[]> {
  const cleanList = [...new Set(tickers.map(t => t.trim().toUpperCase()).filter(Boolean))];
  if (!cleanList.length) return [];
  const rawTickers = [...new Set(cleanList.map(t => t.replace(/\.(WA|PL|US)$/, '')))];
  const encTickers = rawTickers.map(encodeURIComponent).join(',');
  const symbols = [...new Set(rawTickers.flatMap(t => [usQuoteSymbol(t), `${t}.WA`]))];
  const today = getTodayWarsaw();
  const [companiesRead, gpwRead, pricesRead, consensusRead, shortsRead] = await Promise.allSettled([
    orcaSelect<CompanyRow>(`companies?market=eq.us&ticker=in.(${encTickers})&select=ticker,name,listing_status,listing_status_date,listing_source_url`, { strict: true }),
    orcaSelect<CompanyRow>(`gpw_fin_public_teaser?ticker=in.(${encTickers})&select=ticker,name`, { strict: true }),
    orcaSelect<PriceRow>(`prices_daily?ticker=in.(${symbols.map(encodeURIComponent).join(',')})&date=gte.${shiftDateStr(today, -45)}&date=lte.${today}&select=ticker,date,close_raw,currency,source_url&order=ticker.asc,date.asc`, { strict: true }),
    orcaSelect<ConsensusRow>(`vw_sec13f_screener?ticker=in.(${encTickers})&select=ticker,company_name,net_changes,reported_increases,reported_decreases,compared_funds,period_of_report,previous_period,source_urls`, { strict: true }),
    orcaSelect<ShortRow>(`vw_gpw_shorts_agg?ticker=in.(${encTickers})&select=ticker,total_pct,public_holders`, { strict: true }),
  ]);
  const companies = new Map(companiesRead.status === 'fulfilled' ? companiesRead.value.map(c => [c.ticker.toUpperCase(), c]) : []);
  const gpw = new Map(gpwRead.status === 'fulfilled' ? gpwRead.value.map(c => [c.ticker.toUpperCase(), c]) : []);
  const consensus = new Map(consensusRead.status === 'fulfilled' ? consensusRead.value.map(c => [c.ticker.toUpperCase(), c]) : []);
  const shorts = new Map(shortsRead.status === 'fulfilled' ? shortsRead.value.map(c => [c.ticker.toUpperCase(), c]) : []);
  const prices = pricesRead.status === 'fulfilled' ? pricesRead.value : [];
  return cleanList.map(ticker => {
    const raw = ticker.replace(/\.(WA|PL|US)$/, '');
    const market = /\.(WA|PL)$/.test(ticker) || (!ticker.endsWith('.US') && gpw.has(raw) && !consensus.has(raw)) ? 'GPW' : 'USA';
    const listing = market === 'USA' ? companies.get(raw) : undefined;
    const inactive = isListingInactive(listing?.listing_status);
    const symbol = market === 'GPW' ? `${raw}.WA` : usQuoteSymbol(raw);
    const quote = summarizeCompanyPrices(prices.filter(p => p.ticker === symbol), today);
    const validCurrency = quote.priceCurrency === (market === 'GPW' ? 'PLN' : 'USD');
    const c = market === 'USA' ? consensus.get(raw) : undefined;
    const s = market === 'GPW' ? shorts.get(raw) : undefined;
    const signalFailed = (market === 'USA' ? consensusRead : shortsRead).status === 'rejected';
    let lastSignal = signalFailed ? 'Błąd odczytu zdarzeń' : market === 'USA' ? '13F: brak porównania' : 'Brak ujawnionej pozycji KNF';
    let signalsCount: number | null = signalFailed || market === 'USA' ? null : 0;
    if (c?.compared_funds && c.net_changes != null) {
      lastSignal = `13F: bilans zmian ${c.net_changes > 0 ? '+' : ''}${c.net_changes} · ${c.previous_period} → ${c.period_of_report}`;
      signalsCount = (c.reported_increases ?? 0) + (c.reported_decreases ?? 0);
    } else if (s && (s.total_pct ?? 0) > 0) {
      lastSignal = `Szort KNF: ${s.total_pct}% · ${s.public_holders ?? '—'} podmiotów`;
      signalsCount = s.public_holders ?? null;
    }
    if (pricesRead.status === 'rejected') lastSignal += ' · Błąd odczytu kursu';
    return { ticker, market,
      name: market === 'GPW' ? gpw.get(raw)?.name || raw : c?.company_name || listing?.name || raw,
      price: validCurrency && !inactive && quote.price != null ? `${quote.price.toFixed(2)} ${quote.priceCurrency}` : '—',
      priceDate: validCurrency && !inactive ? quote.priceDate : null,
      priceSourceUrl: validCurrency && !inactive ? quote.priceSourceUrl : null,
      changePercent: validCurrency && !inactive ? quote.changeTodayPct : null,
      sparkline: validCurrency && !inactive ? quote.prices.slice(-20).map(p => p.close) : [],
      listingStatus: listing?.listing_status, listingStatusDate: listing?.listing_status_date,
      listingSourceUrl: listing?.listing_source_url,
      signalsCount, lastSignal, signalSourceUrls: c?.source_urls ?? [],
    };
  });
}
