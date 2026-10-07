import { createServiceClient } from '../_shared/supabase.ts';
import { requireServiceRole } from '../_shared/auth.ts';
import { secFetcher } from '../_shared/secForm4Sync.ts';
import { parseSec13fSubmission } from './sec13fData.ts';
import { discoverSec13f } from './sec13fDiscovery.ts';
import { describeSec13fError } from './sec13fErrors.ts';

export async function runSec13fSync(req: Request) {
  const denied = requireServiceRole(req);
  if (denied) return denied;
  const body = await req.clone().json().catch(() => ({}));
  const limit = body.limit ?? 5;
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new Error('SEC 13F limit must be 1–10');
  const db = createServiceClient();
  if (body.discover === true) {
    try { return await discoverSec13f(db, limit); }
    catch (cause) {
      const message = describeSec13fError(cause);
      const { error: saveError } = await db.from('investment_source_status').upsert({
        source: 'sec_13f_discovery', status: 'error', checked_at: new Date().toISOString(), error: message,
      });
      if (saveError) throw saveError;
      throw cause;
    }
  }
  const fetchSec = secFetcher(Deno.env.get('SEC_USER_AGENT') ?? '');
  const checkedAt = new Date().toISOString();
  const { data: investors, error: invError } = await db.from('investors').select('id,cik');
  if (invError) throw invError;
  const ciks = new Map((investors ?? []).map(row => [row.id, row.cik]));
  const requestedPeriod = body.period;
  const requestedFiling = body.filingId;
  if (requestedFiling !== undefined && (typeof requestedFiling !== 'string'
    || !requestedFiling.length || requestedFiling.length > 200)) throw new Error('SEC 13F filingId must be a nonempty identifier');
  if (requestedPeriod !== undefined && (typeof requestedPeriod !== 'string'
    || !/^20\d{2}-(03-31|06-30|09-30|12-31)$/.test(requestedPeriod)
    || requestedPeriod < '2024-01-01'
    || requestedPeriod > checkedAt.slice(0, 10))) throw new Error('SEC 13F period must be a past quarter end from 2024 onward');
  let pendingQuery = db.from('filings').select('id,investor_id,accession_no,period_of_report,filing_url,is_amendment')
    .eq('positions_status', 'pending').gte('period_of_report', '2024-01-01')
    .order('period_of_report', { ascending: false }).order('filing_date', { ascending: false }).limit(limit);
  if (requestedPeriod) pendingQuery = pendingQuery.eq('period_of_report', requestedPeriod);
  if (requestedFiling) pendingQuery = pendingQuery.eq('id', requestedFiling);
  const { data: pending, error } = await pendingQuery;
  if (error) throw error;
  let processed = 0; let positions = 0;
  const errors: Array<{ id: string; error: string }> = [];
  const start = Date.now();
  for (const filing of pending ?? []) {
    if (Date.now() - start > 70000) break;
    try {
      const cik = ciks.get(filing.investor_id);
      const accession = filing.accession_no?.replaceAll('-', '');
      if (!cik || !/^\d{18}$/.test(accession ?? '')) throw new Error('SEC 13F filing identifier missing');
      const dashed = `${accession.slice(0, 10)}-${accession.slice(10, 12)}-${accession.slice(12)}`;
      const base = `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession}/`;
      if (base !== filing.filing_url) throw new Error('SEC 13F cached URL mismatch');
      const submission = await fetchSec(`${base}${dashed}.txt`);
      if (!submission) throw new Error('SEC 13F document unavailable');
      const parsed = parseSec13fSubmission(submission, { accession: dashed, cik, period: filing.period_of_report, isAmendment: filing.is_amendment });
      const { error: saveError } = await db.rpc('replace_sec13f_filing', {
        p_filing_id: filing.id, p_positions: parsed.positions,
        p_entry_count: parsed.entryCount, p_total_value_usd: parsed.totalValueUsd,
        p_reported_cover_value_usd: parsed.reportedCoverValueUsd, p_value_unit_usd: parsed.valueUnitUsd,
        p_amendment_type: parsed.amendmentType, p_amendment_number: parsed.amendmentNumber,
      });
      if (saveError) throw saveError;
      processed++; positions += parsed.entryCount;
    } catch (cause) {
      const message = describeSec13fError(cause);
      errors.push({ id: filing.id, error: message });
      const { error: saveError } = await db.from('filings').update({ positions_status: 'error', positions_error: message }).eq('id', filing.id);
      if (saveError) throw saveError;
    }
  }
  const { count: queued, error: queueError } = await db.from('filings').select('id', { count: 'exact', head: true }).eq('positions_status', 'pending');
  const { count: failed, error: failedError } = await db.from('filings').select('id', { count: 'exact', head: true }).eq('positions_status', 'error');
  const { count: summaryDifferences, error: differenceError } = await db.from('filings').select('id', { count: 'exact', head: true }).eq('value_reconciliation', 'rounding_difference');
  const { data: amendmentCounts, error: amendmentError } = await db.rpc('sec13f_amendment_counts');
  const unreconciledAmendments = amendmentCounts?.unreconciled ?? 0;
  if (queueError || failedError || differenceError || amendmentError) throw queueError ?? failedError ?? differenceError ?? amendmentError;
  const { data: latest, error: latestError } = await db.from('filings').select('filing_date')
    .eq('positions_status', 'parsed').order('filing_date', { ascending: false }).limit(1).maybeSingle();
  if (latestError) throw latestError;
  const partial = (queued ?? 0) > 0 || (failed ?? 0) > 0 || (summaryDifferences ?? 0) > 0 || (unreconciledAmendments ?? 0) > 0;
  const { error: statusError } = await db.from('investment_source_status').upsert({
    source: 'sec_13f', checked_at: checkedAt, status: partial ? 'partial' : 'ok',
    latest_disclosure_date: latest?.filing_date ?? null,
    error: partial ? JSON.stringify({ queued, failed, summaryDifferences, unreconciledAmendments, errors }) : null,
    ...(processed ? { last_success_at: new Date().toISOString() } : {}),
  });
  if (statusError) throw statusError;
  return { ok: errors.length === 0, partial, processed, positions, queued, failed, summaryDifferences, unreconciledAmendments, errors };
}
