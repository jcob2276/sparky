import { orcaSelect } from './superinvestorsApi';
import type { SearchCompanyResult } from './watchlistService';
import { isListingInactive, type ListingStatus } from './companyListing';

interface CompanyRow { ticker?: string; name?: string; company_name?: string; sector?: string }

export async function searchWatchlistCompanies(query: string): Promise<SearchCompanyResult[]> {
  const needle = query.replace(/\$/g, '').trim().toUpperCase();
  if (!needle) return [];
  const enc = encodeURIComponent(needle.replace(/\.(WA|PL|US)$/, ''));
  const gpwOnly = /\.(WA|PL)$/.test(needle);
  const usOnly = needle.endsWith('.US');
  const [usRows, gpwRows] = await Promise.all([
    gpwOnly ? Promise.resolve([]) : orcaSelect<CompanyRow>(
      `vw_sec13f_screener?or=(ticker.ilike.*${enc}*,company_name.ilike.*${enc}*)&select=ticker,company_name&order=ticker.asc&limit=8`, { strict: true }),
    usOnly ? Promise.resolve([]) : orcaSelect<CompanyRow>(
      `gpw_fin_public_teaser?or=(ticker.ilike.*${enc}*,name.ilike.*${enc}*)&select=ticker,name,sector&order=ticker.asc&limit=8`, { strict: true }),
  ]);
  return [
    ...gpwRows.filter(row => row.ticker).map(row => ({ ticker: `${row.ticker}.WA`,
      name: row.name || row.ticker!, market: 'GPW' as const, sector: row.sector })),
    ...usRows.filter(row => row.ticker).map(row => ({ ticker: usOnly || gpwRows.some(gpw => gpw.ticker === row.ticker) ? `${row.ticker}.US` : row.ticker!,
      name: row.company_name || row.ticker!, market: 'USA' as const })),
  ];
}

export async function resolveWatchlistTicker(input: string): Promise<SearchCompanyResult | null> {
  const needle = input.replace(/\$/g, '').trim().toUpperCase().replace(/\.(WA|PL|US)$/, '');
  const results = await searchWatchlistCompanies(input);
  const exact = results.filter(row => row.ticker.replace(/\.(WA|US)$/, '') === needle);
  return exact.length === 1 ? exact[0] : exact.length > 1 ? null : results.length === 1 ? results[0] : null;
}

export async function fetchWatchlistSuggestions(): Promise<SearchCompanyResult[]> {
  const [rows, listings] = await Promise.all([
    orcaSelect<CompanyRow>('vw_sec13f_screener?select=ticker,company_name&compared_funds=gt.0&net_changes=gt.0&order=net_changes.desc,ticker.asc&limit=20', { strict: true }),
    orcaSelect<{ ticker: string; listing_status: ListingStatus }>('companies?market=eq.us&select=ticker,listing_status&limit=500', { strict: true }),
  ]);
  const inactive = new Set(listings.filter(row => isListingInactive(row.listing_status)).map(row => row.ticker));
  return rows.filter(row => row.ticker && !inactive.has(row.ticker)).slice(0, 10)
    .map(row => ({ ticker: row.ticker!, name: row.company_name || row.ticker!, market: 'USA' }));
}
