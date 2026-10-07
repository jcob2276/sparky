import { createServiceClient } from '../_shared/supabase.ts';
import { requireServiceRole } from '../_shared/auth.ts';
import { SenateSession } from './senateDisclosureClient.ts';
import { parseSenateDisclosure,senateDocumentUrl,buildSenateTrades } from './senateDisclosureData.ts';

/** Official eFD documents; discovery failures never become mirror-based freshness. */
export async function runSenateSync(req: Request): Promise<unknown> {
  const denied=requireServiceRole(req);
  if(denied)return denied;
  const body=await req.clone().json().catch(()=>({}));
  const limit=body.limit ?? 3;
  if(!Number.isInteger(limit) || limit<1 || limit>5 || (body.sourceUrls!==undefined
    && (!Array.isArray(body.sourceUrls) || body.sourceUrls.length>10
      || body.sourceUrls.some((url:unknown)=>typeof url!=='string'))))throw new Error('Niepoprawny zakres importu Senatu');
  const explicit: Array<ReturnType<typeof senateDocumentUrl>>=(body.sourceUrls ?? []).map((url:string)=>senateDocumentUrl(url));
  const db=createServiceClient();
  const checkedAt=new Date().toISOString();
  const errors: Array<{document:string;error:string}>=[];
  let transactions=0;
  let parsedDocuments=0;
  try {
    if(explicit.length) {
      const {error}=await db.from('senate_disclosures').upsert(explicit.map(doc=>({id:doc.id,source_url:doc.sourceUrl})),
        {onConflict:'id',ignoreDuplicates:true});
      if(error)throw new Error(`Kolejka Senatu: ${error.message}`);
    }
    const session=new SenateSession();
    await session.open();
    try {
      const documents=await session.discover();
      if(documents.length) {
        const {error}=await db.from('senate_disclosures').upsert(documents.map(doc=>({
          id:doc.id,source_url:doc.sourceUrl,filing_date:doc.filingDate})),{onConflict:'id',ignoreDuplicates:true});
        if(error)throw new Error(`Zapis indeksu Senatu: ${error.message}`);
      }
    } catch(error) {
      errors.push({document:'official_index',error:error instanceof Error?error.message:String(error)});
    }
    const {data:pending,error:pendingError}=await db.from('senate_disclosures').select('id,source_url')
      .eq('parse_status','pending').order('filing_date',{ascending:false,nullsFirst:false})
      .order('first_seen_at',{ascending:true}).limit(limit);
    if(pendingError)throw new Error(`Kolejka Senatu: ${pendingError.message}`);
    const {data:politicians,error:politicianError}=await db.from('politicians').select('id,display_name').eq('chamber','senate');
    if(politicianError)throw new Error(`Rejestr senatorów: ${politicianError.message}`);
    const names=new Map((politicians ?? []).map(p=>[p.display_name.toLowerCase().trim(),p.id]));
    for(const queued of pending ?? []) {
      try {
        const doc=parseSenateDisclosure(await session.report(queued.source_url),queued.source_url);
        const payload=buildSenateTrades(doc,names.get(doc.filerName.toLowerCase().trim()) ?? null);
        const {data,error}=await db.rpc('replace_senate_disclosure',{p_document_id:doc.id,p_filer_name:doc.filerName,
          p_filing_date:doc.filingDate,p_trades:payload});
        if(error)throw new Error(`Zapis transakcji Senatu: ${error.message}`);
        transactions+=Number(data);
        parsedDocuments++;
      } catch(error) {
        const message=error instanceof Error?error.message:String(error);
        errors.push({document:queued.id,error:message});
        const {error:saveError}=await db.from('senate_disclosures').update({parse_status:'error',parse_error:message}).eq('id',queued.id);
        if(saveError)throw new Error(`Zapis błędu Senatu: ${saveError.message}`);
      }
    }
    const [{count:unreadable,error:countError},{data:latest,error:latestError}]=await Promise.all([
      db.from('senate_disclosures').select('id',{count:'exact',head:true}).eq('parse_status','error'),
      db.from('senate_disclosures').select('filing_date').eq('parse_status','parsed').order('filing_date',{ascending:false}).limit(1),
    ]);
    if(countError || latestError)throw new Error(`Kontrola źródła Senatu: ${(countError ?? latestError)!.message}`);
    const partial=errors.length>0 || (unreadable ?? 0)>0;
    const {error}=await db.from('investment_source_status').upsert({source:'senate_efd',checked_at:checkedAt,
      latest_disclosure_date:latest?.[0]?.filing_date ?? null,status:partial?'partial':'ok',
      error:partial?JSON.stringify({unreadableDocuments:unreadable,errors}):null,
      ...((parsedDocuments>0 || !partial)?{last_success_at:new Date().toISOString()}:{}),
    });
    if(error)throw new Error(`Status Senatu: ${error.message}`);
    return {ok:!partial,partial,parsedDocuments,transactions,unreadableDocuments:unreadable,errors,checkedAt};
  } catch(error) {
    const {error:statusError}=await db.from('investment_source_status').upsert({source:'senate_efd',checked_at:checkedAt,
      status:'error',error:error instanceof Error?error.message:String(error)});
    if(statusError)console.error('[senateSync] status write failed',statusError.message);
    throw error;
  }
}
