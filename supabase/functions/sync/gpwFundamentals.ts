import { createServiceClient } from '../_shared/supabase.ts';
import { fetchWithRetry } from '../_shared/httpClient.ts';
import { buildGpwFundamentalsRows, GPW_SCAN_COLUMNS, type GpwIssuer, type GpwScanRow } from './gpwFundamentalsData.ts';

/** Cron/manual refresh; keeps the last successful cache when the source is unavailable. */
export async function runGpwFundamentalsSync(): Promise<unknown> {
  const client = createServiceClient();
  const { data: issuers, error: issuerError } = await client.from('gpw_companies').select('isin,ticker,name');
  if (issuerError) throw new Error(`Rejestr emitentów GPW: ${issuerError.message}`);
  if (!issuers?.length) throw new Error('Rejestr emitentów GPW jest pusty');

  const response = await fetchWithRetry('https://scanner.tradingview.com/poland/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      columns: GPW_SCAN_COLUMNS,
      filter: [
        { left: 'exchange', operation: 'equal', right: 'GPW' },
        { left: 'type', operation: 'equal', right: 'stock' },
      ],
      range: [0, 2000], sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    }),
  }, { timeoutMs: 20_000, retries: 2, logTag: 'gpwFundamentals' });
  if (!response.ok) throw new Error(`Źródło fundamentów GPW: HTTP ${response.status}`);
  const scan = await response.json() as { totalCount?: number; data?: GpwScanRow[] };
  if (!Array.isArray(scan.data) || !scan.data.length || scan.totalCount !== scan.data.length)
    throw new Error('Źródło zwróciło pustą lub niepełną listę GPW');

  const refreshedAt = new Date().toISOString();
  const rows = buildGpwFundamentalsRows(scan.data, issuers as GpwIssuer[], refreshedAt);
  // A partial upstream response must not make a small subset look freshly complete.
  if (rows.length < issuers.length * 0.5) throw new Error('Niepełne pokrycie rejestru emitentów GPW');
  const { error } = await client.from('gpw_fin_public_teaser').upsert(rows, { onConflict: 'isin' });
  if (error) throw new Error(`Zapis fundamentów GPW: ${error.message}`);
  return { ok: true, count: rows.length, registered: issuers.length, refreshedAt };
}
