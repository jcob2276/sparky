/**
 * superinvestorsApi.ts — Pobieranie na żywo superinwestorów 13F,
 * ich pozycji portfelowych oraz konsensusu rynkowego.
 */

import type { CompanyShortSummary } from './knfShortsData';

const SPARKY_SUPABASE_URL = `${(import.meta.env.VITE_SUPABASE_URL || 'https://pdvqkgfsqziqlhptatgf.supabase.co').replace(/\/+$/, '')}/rest/v1`;
const SPARKY_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const HEADERS = {
  apikey: SPARKY_ANON_KEY,
  Authorization: `Bearer ${SPARKY_ANON_KEY}`,
};

async function orcaGet<T>(pathAndQuery: string): Promise<T[]> {
  const res = await fetch(`${SPARKY_SUPABASE_URL}/${pathAndQuery}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Baza Sparky odpowiedziała ${res.status}`);
  const batch: unknown = await res.json();
  if (!Array.isArray(batch)) throw new Error('Baza Sparky zwróciła nieoczekiwany kształt');
  return batch as T[];
}

/** PostgREST pages of 1 000 stop here. Callers must say so when a read hits this cap. */
const QUERY_SELECT_CAP = 20_000;

export async function orcaSelect<T>(pathAndQuery: string): Promise<T[]> {
  if (/[?&]limit=/.test(pathAndQuery)) return orcaGet<T>(pathAndQuery);
  const rows: T[] = [];
  for (let offset = 0; offset < QUERY_SELECT_CAP; offset += 1000) {
    const joiner = pathAndQuery.includes('?') ? '&' : '?';
    const batch = await orcaGet<T>(`${pathAndQuery}${joiner}limit=1000&offset=${offset}`);
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows;
}





export interface LiveConsensusItem {
  ticker: string;
  name: string;
  buyers: number;
  sellers: number;
  totalFunds: number;
  netScore: number;
  totalValueUsd: string;
  movementType: 'accumulation' | 'distribution';
}

function formatUsdCompact(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)} mld`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)} mln`;
  return `$${Math.round(value).toLocaleString('pl-PL')}`;
}

export async function fetchLiveConsensus(): Promise<LiveConsensusItem[]> {
  try {
    const data = await orcaSelect<RawConsensus>(
      'vw_consensus?select=ticker,company_name,buyers,sellers,holders,net_buyers,total_value&order=net_buyers.desc',
    );
    return data
      .filter((d) => Boolean(d.ticker))
      .map((d) => {
        const net = d.net_buyers || 0;
        const buyers = d.buyers || 0;
        const sellers = d.sellers || 0;
        return {
          ticker: d.ticker || '—',
          name: d.company_name || 'Spółka',
          buyers,
          sellers,
          totalFunds: d.holders || buyers + sellers,
          netScore: net,
          totalValueUsd: formatUsdCompact(d.total_value || 0),
          movementType: net >= 0 ? 'accumulation' : 'distribution',
        };
      });
  } catch (err) {
    console.warn('[superinvestorsApi] fetchLiveConsensus error:', err);
    return [];
  }
}

interface RawConsensus {
  ticker?: string;
  company_name?: string;
  buyers?: number;
  sellers?: number;
  holders?: number;
  net_buyers?: number;
  total_value?: number;
}

export async function fetchLiveGpwShorts(): Promise<CompanyShortSummary[]> {
  try {
    const res = await fetch(
      `${SPARKY_SUPABASE_URL}/vw_gpw_shorts_agg?total_pct=gt.0&order=total_pct.desc`,
      { headers: HEADERS }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    interface RawShortAgg {
      company?: string;
      ticker?: string;
      total_pct?: number;
      public_holders?: number;
      last_change?: string;
      top_holder?: string;
      top_holder_pct?: number;
    }

    return data.map((d: RawShortAgg) => ({
      ticker: d.ticker || d.company || 'GPW',
      companyName: d.company || d.ticker || 'Spółka GPW',
      totalShortPercent: typeof d.total_pct === 'number' ? d.total_pct : 0,
      fundsCount: typeof d.public_holders === 'number' ? d.public_holders : 1,
      netChange14d: null,
      positions: d.top_holder
        ? [
            {
              id: `${d.ticker}_${d.top_holder}`,
              ticker: d.ticker || '',
              companyName: d.company || '',
              holderName: d.top_holder,
              shortPercent: d.top_holder_pct || d.total_pct || 0,
              positionDate: d.last_change || '—',
            },
          ]
        : [],
    }));
  } catch (err) {
    console.warn('[superinvestorsApi] fetchLiveGpwShorts error:', err);
    return [];
  }
}


