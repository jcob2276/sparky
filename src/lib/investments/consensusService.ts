/**
 * consensusService.ts — Pobieranie i wzbogacanie konsensusu instytucjonalnego 13F.
 * Wyłącznie zweryfikowane raporty SEC; zmiany stanów nie są dowodem transakcji.
 */

import { orcaSelect } from './superinvestorsApi';
import { summarizeCompanyPrices, type CompanyPriceRow } from './companyPriceHistory';
import { getTodayWarsaw, shiftDateStr } from '../date';
import { usQuoteSymbol } from './marketSymbol';
import { isListingInactive, type ListingStatus } from './companyListing';

export interface EnrichedStockConsensus {
  ticker: string;
  name: string;
  sector: string;
  priceUsd: number | null;
  changeToday: number | null;
  fundsBuying: number;
  fundsSelling: number;
  totalFunds: number;
  totalValueRaw: number;
  totalValueUsd: string;
  netScore: number;
  movementType: 'accumulation' | 'distribution' | 'neutral';
  sparkline: number[];
  comparedFunds: number;
  reportPeriod: string;
  previousPeriod: string;
  sourceUrls: string[];
  priceDate: string | null;
  listingStatus?: ListingStatus;
  listingStatusDate?: string;
  listingSourceUrl?: string;
}

export interface ConsensusStats {
  totalCompanies: number;
  totalMoves: number;
  topBoughtTicker: string;
  topBoughtNet: number;
  topSoldTicker: string;
  topSoldNet: number;
  mostActiveTicker: string;
  mostActiveMoves: number;
  reportPeriod: string | null;
  previousPeriod: string | null;
}

interface RawConsensusRow {
  ticker?: string;
  company_name?: string;
  reported_increases?: number | null;
  reported_decreases?: number | null;
  holders?: number;
  net_changes?: number | null;
  total_value?: number;
  compared_funds?: number;
  period_of_report?: string;
  previous_period?: string;
  source_urls?: string[];
}

interface RawCompanyRow {
  ticker?: string;
  sector?: string;
  listing_status?: ListingStatus;
  listing_status_date?: string;
  listing_source_url?: string;
}

interface RawDailyPriceRow extends CompanyPriceRow {
  ticker?: string;
}

const SECTOR_PL: Record<string, string> = {
  Technology: 'Technologia',
  'Consumer Discretionary': 'Dobra konsumpcyjne',
  Industrials: 'Przemysł',
  'Financial Services': 'Finanse',
  Healthcare: 'Ochrona zdrowia',
  'Communication Services': 'Komunikacja',
  'Consumer Staples': 'Dobra podstawowe',
  Energy: 'Energetyka',
  'Real Estate': 'Nieruchomości',
  Utilities: 'Użyteczność publiczna',
  'Basic Materials': 'Surowce',
};

function formatUsdValue(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace('.', ',')} mld USD`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} mln USD`;
  return `${Math.round(value).toLocaleString('pl-PL')} USD`;
}

export async function fetchEnrichedConsensus(): Promise<{
  items: EnrichedStockConsensus[];
  stats: ConsensusStats;
}> {
    const rawConsensus = await orcaSelect<RawConsensusRow>(
      'vw_sec13f_screener?select=*&order=total_value.desc,ticker.asc', { strict: true }
    );

    const validRows = rawConsensus.filter((r): r is RawConsensusRow & { ticker: string } => Boolean(r.ticker));
    const tickers = validRows.map((r) => r.ticker.toUpperCase());
    const encTickers = tickers.map((t) => encodeURIComponent(t)).join(',');
    const priceTickers = tickers.map(t => encodeURIComponent(usQuoteSymbol(t))).join(',');

    const [companies, prices] = await Promise.all([
      tickers.length ? orcaSelect<RawCompanyRow>(
        `companies?market=eq.us&ticker=in.(${encTickers})&select=ticker,sector,listing_status,listing_status_date,listing_source_url&limit=500`, { strict: true }
      ) : Promise.resolve([]),
      tickers.length ? orcaSelect<RawDailyPriceRow>(
        `prices_daily?ticker=in.(${priceTickers})&date=gte.${shiftDateStr(getTodayWarsaw(), -45)}&order=date.desc,ticker.asc&select=ticker,date,close_raw,currency,source_url`
      ) : Promise.resolve([]),
    ]);

    const sectorMap = new Map<string, string>();
    const listingMap = new Map(companies.filter(c => c.ticker).map(c => [c.ticker!.toUpperCase(), c]));
    for (const c of companies) {
      if (c.ticker && c.sector) {
        sectorMap.set(c.ticker.toUpperCase(), SECTOR_PL[c.sector] || c.sector);
      }
    }

    const pricesByTicker = new Map<string, CompanyPriceRow[]>();
    for (const p of prices) {
      const sym = p.ticker?.toUpperCase();
      if (!sym) continue;
      const list = pricesByTicker.get(sym) || [];
      list.push(p);
      pricesByTicker.set(sym, list);
    }

    let totalMoves = 0;
    const items: EnrichedStockConsensus[] = validRows.map((row) => {
      const ticker = row.ticker.toUpperCase();
      const buyers = row.reported_increases ?? 0;
      const sellers = row.reported_decreases ?? 0;
      const net = row.net_changes ?? 0;
      const totalFunds = row.holders ?? 0;
      const totalVal = row.total_value || 0;
      totalMoves += buyers + sellers;

      const quote = summarizeCompanyPrices(pricesByTicker.get(usQuoteSymbol(ticker)) || []);
      const listing = listingMap.get(ticker);
      const usd = quote.priceCurrency === 'USD' && !isListingInactive(listing?.listing_status);

      return {
        ticker,
        name: row.company_name || ticker,
        sector: sectorMap.get(ticker) || '—',
        priceUsd: usd ? quote.price : null,
        priceDate: usd ? quote.priceDate : null,
        listingStatus: listing?.listing_status ?? 'unknown',
        listingStatusDate: listing?.listing_status_date,
        listingSourceUrl: listing?.listing_source_url,
        changeToday: usd ? quote.changeTodayPct : null,
        fundsBuying: buyers,
        fundsSelling: sellers,
        totalFunds,
        totalValueRaw: totalVal,
        totalValueUsd: formatUsdValue(totalVal),
        netScore: net,
        movementType: net > 0 ? 'accumulation' : net < 0 ? 'distribution' : 'neutral',
        sparkline: usd ? quote.prices.slice(-20).map(p => p.close) : [],
        comparedFunds: row.compared_funds ?? 0,
        reportPeriod: row.period_of_report || '—',
        previousPeriod: row.previous_period || '—',
        sourceUrls: [...new Set(row.source_urls ?? [])].filter(url => /^https:\/\/www\.sec\.gov\/Archives\//.test(url)),
      };
    });

    const sortedByNet = [...items].sort((a, b) => b.netScore - a.netScore);
    const topBought = sortedByNet.find(s => s.netScore > 0);
    const topSold = [...sortedByNet].reverse().find(s => s.netScore < 0);

    const sortedByActivity = [...items].sort(
      (a, b) => b.fundsBuying + b.fundsSelling - (a.fundsBuying + a.fundsSelling)
    );
    const mostActive = sortedByActivity.find(s => s.fundsBuying + s.fundsSelling > 0);

    const stats: ConsensusStats = {
      totalCompanies: items.length,
      totalMoves,
      topBoughtTicker: topBought?.ticker || '—',
      topBoughtNet: topBought?.netScore || 0,
      topSoldTicker: topSold?.ticker || '—',
      topSoldNet: topSold?.netScore || 0,
      mostActiveTicker: mostActive?.ticker || '—',
      mostActiveMoves: mostActive ? mostActive.fundsBuying + mostActive.fundsSelling : 0,
      reportPeriod: rawConsensus[0]?.period_of_report ?? null,
      previousPeriod: rawConsensus[0]?.previous_period ?? null,
    };

    return { items, stats };
}
