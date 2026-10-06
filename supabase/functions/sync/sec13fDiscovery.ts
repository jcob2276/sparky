import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { secFetcher } from '../_shared/secForm4Sync.ts';
import { parseSec13fRecent } from './sec13fData.ts';
import { describeSec13fError } from './sec13fErrors.ts';

/** Rotating SEC submissions reads replay the recent history, including missed runs. */
export async function discoverSec13f(db: SupabaseClient, limit: number) {
  const fetchSec = secFetcher(Deno.env.get('SEC_USER_AGENT') ?? '');
  const { data: investors, error } = await db.from('investors').select('id,cik').eq('is_active', true).order('id');
  if (error) throw error;
  const eligible = (investors ?? []).filter(row => /^\d{1,10}$/.test(row.cik ?? ''));
  if (!eligible.length) throw new Error('No SEC 13F filers configured');
  const batches = Math.ceil(eligible.length / limit);
  const batch = Math.floor(Date.now() / 600000) % batches;
  const selected = eligible.slice(batch * limit, (batch + 1) * limit);
  const started = Date.now(); let checked = 0; let discovered = 0;
  const errors: Array<{ cik: string; error: string }> = [];
  for (const investor of selected) {
    if (Date.now() - started > 60000) break;
    try {
      const input = await fetchSec(`https://data.sec.gov/submissions/CIK${investor.cik.padStart(10, '0')}.json`);
      if (!input) throw new Error('SEC submissions unavailable');
      const recent = parseSec13fRecent(input, investor.cik);
      const known = new Set<string>();
      for (let offset = 0; offset < recent.length; offset += 100) {
        const { data, error: readError } = await db.from('filings').select('accession_no')
          .eq('investor_id', investor.id).in('accession_no', recent.slice(offset, offset + 100).map(row => row.accession.replaceAll('-', '')));
        if (readError) throw readError;
        for (const filing of data ?? []) known.add(filing.accession_no);
      }
      const missing = recent.filter(row => !known.has(row.accession.replaceAll('-', ''))).map(row => {
        const accession = row.accession.replaceAll('-', '');
        return {
          id: `sec13f:${investor.id}:${accession}`, investor_id: investor.id,
          accession_no: accession, period_of_report: row.period,
          filing_date: row.filingDate, is_amendment: row.isAmendment,
          filing_url: `https://www.sec.gov/Archives/edgar/data/${Number(investor.cik)}/${accession}/`,
        };
      });
      if (missing.length) {
        const { error: saveError } = await db.from('filings').upsert(missing, { onConflict: 'id', ignoreDuplicates: true });
        if (saveError) throw saveError;
      }
      discovered += missing.length; checked++;
    } catch (cause) {
      errors.push({ cik: investor.cik, error: describeSec13fError(cause) });
    }
  }
  const partial = errors.length > 0 || checked < selected.length;
  const { error: statusError } = await db.from('investment_source_status').upsert({
    source: 'sec_13f_discovery', checked_at: new Date().toISOString(), status: partial ? 'partial' : 'ok',
    ...(checked ? { last_success_at: new Date().toISOString() } : {}),
    error: partial ? JSON.stringify({ batch, batches, checked, selected: selected.length, errors }) : null,
  });
  if (statusError) throw statusError;
  return { ok: errors.length === 0, partial, checked, discovered, batch, batches, filers: eligible.length, errors };
}
