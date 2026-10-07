import { createServiceClient } from '../_shared/supabase.ts';
import { fetchWithRetry } from '../_shared/httpClient.ts';
import { buildGpwFundamentalsRows, GPW_SCAN_COLUMNS, type GpwIssuer, type GpwScanRow } from './gpwFundamentalsData.ts';
import { fetchGpwFxTable } from './gpwFundamentalsFx.ts';

/** Cron/manual refresh; keeps the last successful cache when the source is unavailable. */
export async function runGpwFundamentalsSync(): Promise<unknown> {
  const client = createServiceClient();
  const checkedAt = new Date().toISOString();
  try {
  const { data: issuers, error: issuerError } = await client.from('gpw_companies').select('isin,ticker,name');
  if (issuerError) throw new Error(`Rejestr emitentów GPW: ${issuerError.message}`);
  if (!issuers?.length) throw new Error('Rejestr emitentów GPW jest pusty');

  const [response, fx] = await Promise.all([fetchWithRetry('https://scanner.tradingview.com/poland/scan', {
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
  }, { timeoutMs: 20_000, retries: 2, logTag: 'gpwFundamentals' }), fetchGpwFxTable()]);
  if (!response.ok) throw new Error(`Źródło fundamentów GPW: HTTP ${response.status}`);
  const scan = await response.json() as { totalCount?: number; data?: GpwScanRow[] };
  if (!Array.isArray(scan.data) || !scan.data.length || scan.totalCount !== scan.data.length)
    throw new Error('Źródło zwróciło pustą lub niepełną listę GPW');

  const refreshedAt = new Date().toISOString();
  const rows = buildGpwFundamentalsRows(scan.data, issuers as GpwIssuer[], refreshedAt, fx);
  // The registry also contains rights to shares and historical unpriced ISINs.
  // Coverage describes issuers with tickers, not the number of security codes.
  const registeredTickers = new Set(issuers.map(issuer => issuer.ticker).filter((ticker): ticker is string => Boolean(ticker)));
  const matchedTickers = new Set(rows.map(row => row.ticker));
  const missingTickers = [...registeredTickers].filter(ticker => !matchedTickers.has(ticker)).sort();
  const coverage = { registeredTickers: registeredTickers.size, matchedTickers: matchedTickers.size,
    missingTickers, unmappedRecords: issuers.filter(issuer => !issuer.ticker).length };
  // A partial upstream response must not make a small subset look freshly complete.
  if (!registeredTickers.size || matchedTickers.size < registeredTickers.size * 0.5)
    throw new Error('Niepełne pokrycie rejestru emitentów GPW');
  const { error } = await client.from('gpw_fin_public_teaser').upsert(rows, { onConflict: 'isin' });
  if (error) throw new Error(`Zapis fundamentów GPW: ${error.message}`);
  const partial = missingTickers.length > 0;
  const { error: statusError } = await client.from('investment_source_status').upsert({
    source: 'gpw_fundamentals', checked_at: checkedAt, last_success_at: refreshedAt,
    // Provider refresh time is not the publication date of a financial report.
    latest_disclosure_date: null, status: partial ? 'partial' : 'ok',
    error: partial ? JSON.stringify(coverage) : null,
  }, { onConflict: 'source' });
  if (statusError) throw new Error(`Status fundamentów GPW: ${statusError.message}`);
  return { ok: !partial, partial, count: rows.length, registered: issuers.length, coverage, refreshedAt,
    forwardPeCount: rows.filter((row) => row.forward_pe != null).length, fxDate: fx.date,
    sources: ['tradingview_scanner', 'nbp'] };
  } catch (error) {
    const { error: statusError } = await client.from('investment_source_status').upsert({
      source: 'gpw_fundamentals', checked_at: checkedAt, status: 'error',
      error: error instanceof Error ? error.message : String(error),
    }, { onConflict: 'source' });
    if (statusError) console.error('[gpwFundamentals] status write failed', statusError.message);
    throw error;
  }
}
