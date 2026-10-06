import { createServiceClient } from '../_shared/supabase.ts';
import { requireServiceRole } from '../_shared/auth.ts';
import { fetchKnfRecords, normalizeKnfRecord } from './knfShortData.ts';

export async function runKnfShortsSync(req: Request): Promise<unknown> {
  const denied = requireServiceRole(req);
  if (denied) return denied;
  const client = createServiceClient();
  const checkedAt = new Date().toISOString();
  try {
    const [current, history, companies] = await Promise.all([
      fetchKnfRecords('Default'), fetchKnfRecords('RssHTable'),
      client.from('gpw_companies').select('isin,ticker'),
    ]);
    if (companies.error) throw new Error(`Mapowanie ISIN: ${companies.error.message}`);
    const tickers = new Map<string, string>();
    for (const row of companies.data ?? []) if (row.isin && row.ticker) tickers.set(row.isin, row.ticker);
    const [currentRows, historyRows] = await Promise.all([
      Promise.all(current.map((row) => normalizeKnfRecord(row, tickers))),
      Promise.all(history.map((row) => normalizeKnfRecord(row, tickers))),
    ]);
    const currentKeys = currentRows.map((row) => `${row.holder}:${row.isin}`);
    if (new Set(currentKeys).size !== currentKeys.length || currentRows.some((row) => row.below_public_threshold))
      throw new Error('Niespójny bieżący rejestr KNF');
    const { data, error } = await client.rpc('replace_knf_snapshot', {
      p_current: currentRows, p_history: historyRows, p_checked_at: checkedAt,
    });
    if (error) throw new Error(`Zapis rejestru KNF: ${error.message}`);
    return { ok: true, currentPositions: currentRows.length, historyPositions: historyRows.length, checkedAt, result: data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await client.from('investment_source_status').upsert({ source: 'knf_shorts', checked_at: checkedAt,
      status: 'error', error: message }, { onConflict: 'source' });
    throw error;
  }
}
