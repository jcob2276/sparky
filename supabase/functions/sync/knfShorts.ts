/**
 * knfShorts.ts — Oficjalna synchronizacja pozycji krótkiej sprzedaży (KNF RSS).
 * Pobiera dane bezpośrednio z publicznego endpointu JSON Komisji Nadzoru Finansowego:
 * https://rss.knf.gov.pl/rss_pub/JSON
 */

import { createServiceClient } from '../_shared/supabase.ts';

interface KnfJsonRecord {
  HOLDER_FULL_NAME: string;
  POSITION_DATE: string;
  ISSUER_NAME: string;
  MODIFY_DATE?: string;
  ISIN: string;
  recid?: number;
  NET_SHORT_POSITION_O: string;
}

interface CompanyRow {
  isin: string | null;
  ticker: string | null;
}

const KNOWN_TICKERS: Record<string, string> = {
  PLOPTTC00011: 'CDR',
  PL11B0000014: '11B',
  PLTENSR00018: 'TSG',
  PLDNP0000013: 'DNP',
  PLBIG0000016: 'MIL',
  PLALR0000011: 'ALR',
  PLPEKAO00016: 'PEO',
  PLPKN0000018: 'PKN',
  PLBZ00000044: 'SPL',
  PLKRK0000010: 'KRU',
  PLJSW0000015: 'JSW',
  PLKTY0000017: 'KTY',
  PLMDL0000019: 'MDL',
  PLXTB0000010: 'XTB',
};

export async function runKnfShortsSync(_req: Request): Promise<unknown> {
  const reqObj = {
    cmd: 'get',
    language: 'pl',
    search: [],
    limit: 200,
    offset: 0,
    method: 'Default',
    sort: [{ field: 'POSITION_DATE', direction: 'desc' }],
    searchLogic: 'AND',
    searchValue: '',
  };

  const body = 'request=' + encodeURIComponent(JSON.stringify(reqObj));
  const res = await fetch('https://rss.knf.gov.pl/rss_pub/JSON', {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://rss.knf.gov.pl/rss_pub/',
    },
    body,
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`KNF RSS serwer odpowiedział kodem ${res.status}`);
  }

  const data = (await res.json()) as { total?: number; records?: KnfJsonRecord[] };
  const records = data.records || [];
  if (records.length === 0) {
    return { ok: true, count: 0, message: 'Brak pozycji w rejestrze KNF' };
  }

  const client = createServiceClient();

  // Resolve tickers from gpw_companies
  const { data: companies } = await client
    .from('gpw_companies')
    .select('isin, ticker');
  const isinToTicker = new Map<string, string>();
  ((companies as CompanyRow[]) || []).forEach((c) => {
    if (c.isin && c.ticker) isinToTicker.set(c.isin, c.ticker);
  });

  const payload = records.map((r, idx) => {
    const isin = r.ISIN || '';
    const pct = parseFloat((r.NET_SHORT_POSITION_O || '0').replace(',', '.')) || 0;
    const ticker = isinToTicker.get(isin) || KNOWN_TICKERS[isin] || r.ISSUER_NAME.slice(0, 5).toUpperCase();
    const positionDate = r.POSITION_DATE || new Date().toISOString().slice(0, 10);
    const modifyDate = r.MODIFY_DATE || positionDate;

    return {
      id: Date.now() + idx,
      holder: r.HOLDER_FULL_NAME || 'Nieznany Podmiot',
      company: r.ISSUER_NAME || 'Spółka GPW',
      isin,
      ticker,
      position_pct: pct,
      position_pct_raw: `${r.NET_SHORT_POSITION_O}%`,
      below_public_threshold: false,
      position_date: positionDate,
      modify_date: modifyDate,
      source_url: 'https://rss.knf.gov.pl/',
      source_system: 'knf_rss_official',
    };
  });

  const { error: upsertError } = await client
    .from('gpw_short_positions')
    .upsert(payload, { ignoreDuplicates: true });

  if (upsertError) {
    console.warn('[knfSync] Error inserting short positions:', upsertError.message);
  }

  // Refresh aggregated cache (vw_gpw_shorts_agg)
  const byCompany = new Map<string, { company: string; ticker: string; totalPct: number; count: number; lastDate: string }>();
  for (const p of payload) {
    const tickerStr = typeof p.ticker === 'string' ? p.ticker : 'GPW';
    const prev = byCompany.get(p.company) || { company: p.company, ticker: tickerStr, totalPct: 0, count: 0, lastDate: p.position_date };
    prev.totalPct = Math.round((prev.totalPct + p.position_pct) * 100) / 100;
    prev.count += 1;
    if (p.position_date > prev.lastDate) prev.lastDate = p.position_date;
    byCompany.set(p.company, prev);
  }

  const aggRows = Array.from(byCompany.values()).map(v => ({
    company: v.company,
    ticker: v.ticker,
    total_pct: v.totalPct,
    public_holders: v.count,
    below_threshold: 0,
    last_change: v.lastDate,
    top_holder: null,
    top_holder_pct: null,
  }));

  if (aggRows.length > 0) {
    await client.from('vw_gpw_shorts_agg').upsert(aggRows, { onConflict: 'company' });
  }

  return {
    ok: true,
    count: payload.length,
    timestamp: new Date().toISOString(),
  };
}
