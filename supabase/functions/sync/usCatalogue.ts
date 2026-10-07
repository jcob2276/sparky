import { createServiceClient } from '../_shared/supabase.ts';
import { requireServiceRole } from '../_shared/auth.ts';
import { secFetcher } from '../_shared/secForm4Sync.ts';
import { describeSec13fError } from './sec13fErrors.ts';
import { parseUsCatalogue, US_CATALOGUE_SOURCE } from './usCatalogueData.ts';

export async function runUsCatalogueSync(req: Request): Promise<unknown> {
  const denied = requireServiceRole(req);
  if (denied) return denied;
  const db = createServiceClient();
  const checkedAt = new Date().toISOString();
  try {
    const raw = await secFetcher(Deno.env.get('SEC_USER_AGENT') ?? '')(US_CATALOGUE_SOURCE);
    if (!raw) throw new Error('SEC catalogue unavailable');
    const rows = parseUsCatalogue(JSON.parse(raw));
    const { data, error } = await db.rpc('replace_us_security_catalogue', { p_rows: rows, p_checked_at: checkedAt });
    if (error) throw error;
    return { ok: true, records: data, source: US_CATALOGUE_SOURCE, checkedAt };
  } catch (cause) {
    const { error } = await db.from('investment_source_status').upsert({ source: 'sec_us_catalogue',
      checked_at: checkedAt, status: 'error', error: describeSec13fError(cause) });
    if (error) throw error;
    throw cause;
  }
}
