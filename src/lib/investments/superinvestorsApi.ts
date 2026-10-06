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

interface ReadOptions { strict?: boolean }

async function orcaGet<T>(pathAndQuery: string, options: ReadOptions): Promise<T[]> {
  try {
    const res = await fetch(`${SPARKY_SUPABASE_URL}/${pathAndQuery}`, {
      headers: HEADERS, signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 404 && !options.strict) {
      console.warn(`[superinvestorsApi] Tabela/widok ${pathAndQuery.split('?')[0]} nie istnieje jeszcze w bazie — zwracam puste dane.`);
      return [];
    }
    if (!res.ok) throw new Error(`Baza Sparky odpowiedziała ${res.status}`);
    const batch: unknown = await res.json();
    if (!Array.isArray(batch)) throw new Error('Nieprawidłowa odpowiedź bazy Sparky');
    return batch as T[];
  } catch (err) {
    if (options.strict) throw err;
    console.warn(`[superinvestorsApi] Błąd odczytu ${pathAndQuery}:`, err);
    return [];
  }
}

/** PostgREST pages of 1 000 stop here. Callers must say so when a read hits this cap. */
const QUERY_SELECT_CAP = 20_000;

export async function orcaSelect<T>(pathAndQuery: string, options: ReadOptions = {}): Promise<T[]> {
  if (/[?&]limit=/.test(pathAndQuery)) return orcaGet<T>(pathAndQuery, options);
  const rows: T[] = [];
  for (let offset = 0; offset < QUERY_SELECT_CAP; offset += 1000) {
    const joiner = pathAndQuery.includes('?') ? '&' : '?';
    const batch = await orcaGet<T>(`${pathAndQuery}${joiner}limit=1000&offset=${offset}`, options);
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows;
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


