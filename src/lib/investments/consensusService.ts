/**
 * consensusService.ts — Pobieranie i wzbogacanie konsensusu instytucjonalnego 13F.
 * Łączy dane z `vw_consensus`, sektory z `companies` oraz notowania i sparklines z `prices_daily`.
 */

import { orcaSelect } from './superinvestorsApi';

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
}

interface RawConsensusRow {
  ticker?: string;
  company_name?: string;
  buyers?: number;
  sellers?: number;
  holders?: number;
  net_buyers?: number;
  total_value?: number;
}

interface RawCompanyRow {
  ticker?: string;
  sector?: string;
}

interface RawDailyPriceRow {
  ticker?: string;
  close_raw?: number;
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
  try {
    const rawConsensus = await orcaSelect<RawConsensusRow>(
      'vw_consensus?select=ticker,company_name,buyers,sellers,holders,net_buyers,total_value&order=total_value.desc.nullslast'
    );

    const validRows = rawConsensus.filter((r): r is RawConsensusRow & { ticker: string } => Boolean(r.ticker));
    const tickers = validRows.map((r) => r.ticker.toUpperCase());
    const encTickers = tickers.map((t) => encodeURIComponent(t)).join(',');

    const [companies, prices] = await Promise.all([
      orcaSelect<RawCompanyRow>(
        `companies?ticker=in.(${encTickers})&select=ticker,sector&limit=500`
      ).catch(() => []),
      orcaSelect<RawDailyPriceRow>(
        `prices_daily?ticker=in.(${encTickers})&order=date.desc&select=ticker,close_raw&limit=2500`
      ).catch(() => []),
    ]);

    const sectorMap = new Map<string, string>();
    for (const c of companies) {
      if (c.ticker && c.sector) {
        sectorMap.set(c.ticker.toUpperCase(), SECTOR_PL[c.sector] || c.sector);
      }
    }

    const pricesByTicker = new Map<string, number[]>();
    for (const p of prices) {
      const sym = p.ticker?.toUpperCase();
      if (!sym || p.close_raw == null || p.close_raw <= 0) continue;
      const list = pricesByTicker.get(sym) || [];
      if (list.length < 20) {
        list.push(p.close_raw);
        pricesByTicker.set(sym, list);
      }
    }

    let totalMoves = 0;
    const items: EnrichedStockConsensus[] = validRows.map((row) => {
      const ticker = row.ticker.toUpperCase();
      const buyers = row.buyers || 0;
      const sellers = row.sellers || 0;
      const net = row.net_buyers ?? buyers - sellers;
      const totalFunds = row.holders || buyers + sellers;
      const totalVal = row.total_value || 0;
      totalMoves += buyers + sellers;

      const series = pricesByTicker.get(ticker) || [];
      const latestPrice = series[0] ?? null;
      const prevPrice = series[1] ?? null;

      let changeToday: number | null = null;
      if (latestPrice != null && prevPrice != null && prevPrice > 0) {
        changeToday = ((latestPrice - prevPrice) / prevPrice) * 100;
      }

      return {
        ticker,
        name: row.company_name || ticker,
        sector: sectorMap.get(ticker) || 'Technologia',
        priceUsd: latestPrice,
        changeToday,
        fundsBuying: buyers,
        fundsSelling: sellers,
        totalFunds,
        totalValueRaw: totalVal,
        totalValueUsd: formatUsdValue(totalVal),
        netScore: net,
        movementType: net > 0 ? 'accumulation' : net < 0 ? 'distribution' : 'neutral',
        sparkline: [...series].reverse(),
      };
    });

    const sortedByNet = [...items].sort((a, b) => b.netScore - a.netScore);
    const topBought = sortedByNet[0];
    const topSold = sortedByNet[sortedByNet.length - 1];

    const sortedByActivity = [...items].sort(
      (a, b) => b.fundsBuying + b.fundsSelling - (a.fundsBuying + a.fundsSelling)
    );
    const mostActive = sortedByActivity[0];

    const stats: ConsensusStats = {
      totalCompanies: items.length,
      totalMoves,
      topBoughtTicker: topBought?.ticker || '—',
      topBoughtNet: topBought?.netScore || 0,
      topSoldTicker: topSold?.ticker || '—',
      topSoldNet: topSold?.netScore || 0,
      mostActiveTicker: mostActive?.ticker || '—',
      mostActiveMoves: mostActive ? mostActive.fundsBuying + mostActive.fundsSelling : 0,
    };

    return { items, stats };
  } catch (err) {
    console.warn('[consensusService] fetchEnrichedConsensus error:', err);
    return {
      items: [],
      stats: {
        totalCompanies: 0,
        totalMoves: 0,
        topBoughtTicker: '—',
        topBoughtNet: 0,
        topSoldTicker: '—',
        topSoldNet: 0,
        mostActiveTicker: '—',
        mostActiveMoves: 0,
      },
    };
  }
}
