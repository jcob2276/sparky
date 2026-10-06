import { unzipSync, strFromU8 } from 'https://esm.sh/fflate@0.8.2';
import { createServiceClient } from '../_shared/supabase.ts';
import { requireServiceRole } from '../_shared/auth.ts';
import { parseHouseIndex } from './houseDisclosureData.ts';
import { readHousePdf } from './houseDisclosurePdf.ts';

export async function runHouseDisclosuresSync(req: Request): Promise<unknown> {
  const denied = requireServiceRole(req);
  if (denied) return denied;
  const body = await req.clone().json().catch(() => ({}));
  const currentYear = new Date().getUTCFullYear();
  const year = body.year ?? currentYear;
  const limit = body.limit ?? 5;
  if (!Number.isInteger(year) || year < 2012 || year > currentYear
    || !Number.isInteger(limit) || limit < 1 || limit > 10) throw new Error('Niepoprawny zakres House PTR');
  const db = createServiceClient();
  const checkedAt = new Date().toISOString();
  try {
    const sourceUrl = `https://disclosures-clerk.house.gov/public_disc/financial-pdfs/${year}FD.zip`;
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`House disclosure index: HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > 15_000_000) throw new Error('Zbyt duży indeks House PTR');
    const archive = unzipSync(bytes, { filter: (file) => file.name === `${year}FD.xml` && file.originalSize < 15_000_000 });
    if (!archive[`${year}FD.xml`]) throw new Error('Brak XML w indeksie House PTR');
    const documents = parseHouseIndex(strFromU8(archive[`${year}FD.xml`]), year);
    if (!documents.length) throw new Error('Oficjalny indeks nie zawiera zgłoszeń PTR');
    for (let i = 0; i < documents.length; i += 200) {
      const { error } = await db.from('house_disclosures').upsert(documents.slice(i, i + 200).map((doc) => ({
        id: `house-${year}-${doc.docId}`, doc_id: doc.docId, year, filer_name: doc.name,
        filing_date: doc.filingDate, source_url: doc.sourceUrl,
      })), { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw new Error(`Zapis indeksu House: ${error.message}`);
    }
    const { data: pending, error: pendingError } = await db.from('house_disclosures')
      .select('id,doc_id,filer_name,filing_date,source_url').eq('year', year).eq('parse_status', 'pending')
      .order('filing_date', { ascending: false }).order('doc_id', { ascending: false }).limit(limit);
    if (pendingError) throw new Error(`Kolejka House: ${pendingError.message}`);
    const { data: politicians, error: politiciansError } = await db.from('politicians')
      .select('id,display_name').eq('chamber', 'house');
    if (politiciansError) throw new Error(`Rejestr polityków: ${politiciansError.message}`);
    const names = new Map((politicians ?? []).map((p) => [p.display_name?.toLowerCase().trim(), p.id]));
    let transactions = 0;
    const errors: Array<{ docId: string; error: string }> = [];
    for (const doc of pending ?? []) {
      try {
        const rows = await readHousePdf(doc.source_url);
        const payload = rows.map((row, index) => ({
          id: `house-${year}-${doc.doc_id}-${index}`,
          politician_id: names.get(doc.filer_name.toLowerCase().trim()) ?? null,
          filer_name: doc.filer_name, chamber: 'house', ticker: row.ticker, asset_description: row.asset,
          transaction_date: row.transactionDate, disclosure_date: doc.filing_date,
          notification_date: row.notificationDate, transaction_type: row.type,
          owner: row.owner, amount_low: row.amountLow, amount_high: row.amountHigh,
          source: 'house_clerk', source_url: doc.source_url, external_id: `house-clerk|${doc.doc_id}|${index}`,
        }));
        const { data, error } = await db.rpc('replace_house_disclosure', { p_document_id: doc.id, p_trades: payload });
        if (error) throw new Error(`Zapis transakcji: ${error.message}`);
        transactions += Number(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ docId: doc.doc_id, error: message });
        const { error: saveError } = await db.from('house_disclosures').update({
          parse_status: 'error', parse_error: message,
        }).eq('id', doc.id);
        if (saveError) throw new Error(`Zapis błędu parsera: ${saveError.message}`);
      }
    }
    const { count: unreadable, error: countError } = await db.from('house_disclosures')
      .select('id', { count: 'exact', head: true }).eq('year', year).eq('parse_status', 'error');
    if (countError) throw new Error(`Kontrola nieodczytanych dokumentów: ${countError.message}`);
    const partial = errors.length > 0 || (unreadable ?? 0) > 0;
    const { error } = await db.from('investment_source_status').upsert({
      source: 'house_clerk', checked_at: checkedAt, latest_disclosure_date: documents[0].filingDate,
      status: partial ? 'partial' : 'ok', error: partial
        ? JSON.stringify({ unreadableDocuments: unreadable, currentErrors: errors }) : null,
      ...(!errors.length ? { last_success_at: new Date().toISOString() } : {}),
    });
    if (error) throw new Error(`Status źródła House: ${error.message}`);
    return { ok: !partial, partial, indexCount: documents.length, unreadableDocuments: unreadable,
      parsedDocuments: (pending?.length ?? 0) - errors.length, transactions, errors,
      latestFilingDate: documents[0].filingDate, checkedAt, sourceUrl };
  } catch (error) {
    await db.from('investment_source_status').upsert({ source: 'house_clerk', checked_at: checkedAt,
      status: 'error', error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}
