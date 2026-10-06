import { orcaSelect } from './superinvestorsApi';
import type { SearchCompanyResult } from './watchlistService';

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
