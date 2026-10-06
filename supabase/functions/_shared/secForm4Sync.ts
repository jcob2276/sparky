import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseCurrentFeed, parseMasterIndex, parseOwnership } from './secForm4.ts';

/** Serialized, contact-identified requests stay well below SEC's 10 requests/second ceiling. */
export function secFetcher(userAgent: string) {
  if (!/\S+@\S+\.\S+/.test(userAgent)) throw new Error('Configure SEC_USER_AGENT with organization and contact email');
  return async (url: string): Promise<string | null> => {
    if (!/^https:\/\/(?:www|data)\.sec\.gov\//.test(url)) throw new Error('Invalid SEC URL');
    for (let attempt = 0; attempt < 3; attempt++) {
      await new Promise(resolve => setTimeout(resolve, attempt ? 1000 * 2 ** attempt : 250));
      const response = await fetch(url, { headers: { 'User-Agent': userAgent, Accept: 'application/atom+xml,application/xml,text/plain,*/*' }, signal: AbortSignal.timeout(15000) });
      if (response.status === 404) return null;
      if (response.ok) return response.text();
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 2) throw new Error(`SEC HTTP ${response.status}`);
      await response.body?.cancel();
    }
    throw new Error('SEC retries exhausted');
  };
}

export async function syncSecForm4(supabase: SupabaseClient, options: { limit?: number; days?: number } = {}) {
  const fetchSec = secFetcher(Deno.env.get('SEC_USER_AGENT') ?? '');
  const limit = Math.max(1, Math.min(60, Number.isFinite(options.limit) ? Math.floor(options.limit!) : 30));
  const days = Math.max(1, Math.min(31, Number.isFinite(options.days) ? Math.floor(options.days!) : 3));
  const discovered = new Map<string, ReturnType<typeof parseMasterIndex>[number]>();
  // Current feed covers all issuers. Daily indexes provide a durable, complete discovery path after the SEC publishes them.
  for (let start = 0; start < 2000; start += 100) {
    const feed = await fetchSec(`https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4&owner=only&count=100&start=${start}&output=atom`);
    if (!feed || !/<feed[\s>]/.test(feed)) throw new Error('SEC current feed unavailable or malformed');
    const rows = parseCurrentFeed(feed ?? '');
    rows.forEach(r => discovered.set(r.accession, r));
    if (rows.length < 100 || rows.every(r => Date.parse(r.filing_date) < Date.now() - days * 86400000)) break;
  }
  for (let offset = 1; offset <= days; offset++) {
    const date = new Date(Date.now() - offset * 86400000);
    if ([0, 6].includes(date.getUTCDay())) continue;
    const year = date.getUTCFullYear(); const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
    const stamp = date.toISOString().slice(0, 10).replaceAll('-', '');
    const index = await fetchSec(`https://www.sec.gov/Archives/edgar/daily-index/${year}/QTR${quarter}/master.${stamp}.idx`);
    parseMasterIndex(index ?? '').forEach(r => discovered.set(r.accession, r));
  }
  if (discovered.size) {
    const { error } = await supabase.from('sec_form4_filings').upsert([...discovered.values()], { onConflict: 'accession', ignoreDuplicates: true });
    if (error) throw error;
  }
  const { data: pending, error } = await supabase.from('sec_form4_filings').select('*').in('status', ['pending', 'failed']).lt('attempts', 5).order('filing_date').limit(limit);
  if (error) throw error;
  let synced = 0; let processed = 0; let failed = 0;
  const started = Date.now();
  for (const filing of pending ?? []) {
    if (Date.now() - started > 80000) break;
    try {
      const submission = await fetchSec(filing.submission_url);
      if (!submission) throw new Error('SEC filing not found');
      const xml = submission.match(/<ownershipDocument[\s\S]*?<\/ownershipDocument>/)?.[0];
      if (!xml) throw new Error('SEC ownership XML missing from submission');
      const documents = Array.from(submission.matchAll(/<DOCUMENT>([\s\S]*?)<\/DOCUMENT>/g), m => m[1]);
      const filename = documents.find(d => d.includes('<ownershipDocument'))?.match(/<FILENAME>([^\r\n<]+)/)?.[1]?.trim();
      const base = filing.submission_url.slice(0, filing.submission_url.lastIndexOf('/') + 1);
      const directory = filing.accession.replaceAll('-', '');
      const documentBase = base.endsWith(directory + '/') ? base : base + directory + '/';
      const docUrl = filename && /^[\w.\-]+$/.test(filename) ? `${documentBase}${filename}` : filing.submission_url;
      const records = parseOwnership(xml, { ...filing, doc_url: docUrl });
      if (records.length) {
        const { error } = await supabase.from('insider_trades').upsert(records, { onConflict: 'id' });
        if (error) throw error;
      }
      const { error } = await supabase.from('sec_form4_filings').update({ status: 'processed', transaction_count: records.length, processed_at: new Date().toISOString(), error: null, attempts: filing.attempts + 1 }).eq('accession', filing.accession);
      if (error) throw error;
      processed++; synced += records.length;
    } catch (error) {
      failed++;
      const { error: updateError } = await supabase.from('sec_form4_filings').update({ status: 'failed', error: error instanceof Error ? error.message : String(error), attempts: filing.attempts + 1 }).eq('accession', filing.accession);
      if (updateError) throw updateError;
    }
  }
  const { count: queued, error: queueError } = await supabase.from('sec_form4_filings').select('accession', { count: 'exact', head: true }).neq('status', 'processed');
  if (queueError) throw queueError;
  return { success: failed === 0, synced, processed, failed, queued, discovered: discovered.size, discoveryDays: days, source: 'SEC EDGAR Form 4', ...(failed ? { error: `${failed} filing(s) failed; retained for retry` } : {}) };
}
