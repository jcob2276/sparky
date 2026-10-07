import { pathToFileURL } from 'node:url';

// The bundle is compiled from the same source adapter used by the Edge handler.
const {SenateSession,parseSenateDisclosure,buildSenateTrades}=await import(pathToFileURL(process.argv[2]).href);
const base=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!base || !key)throw Error('Missing Senate worker database configuration');
const headers={apikey:key,'Content-Type':'application/json',...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{})};
async function db(path,data,method='GET') {
  const response=await fetch(`${base}/rest/v1/${path}`,{method,headers,
    ...(data===undefined?{}:{body:JSON.stringify(data)}),signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw Error(`Senate database HTTP ${response.status}: ${await response.text()}`);
  const raw=await response.text();return raw?JSON.parse(raw):null;
}
const checkedAt=new Date().toISOString();
const errors=[];
let parsedDocuments=0;
let transactions=0;
try {
  const session=new SenateSession();
  await session.open();
  try {
    const discovered=await session.discover();
    if(discovered.length)await fetch(`${base}/rest/v1/senate_disclosures?on_conflict=id`,{method:'POST',
      headers:{...headers,Prefer:'resolution=ignore-duplicates'},
      body:JSON.stringify(discovered.map(d=>({id:d.id,source_url:d.sourceUrl,filing_date:d.filingDate}))),
      signal:AbortSignal.timeout(45000)}).then(async r=>{if(!r.ok)throw Error(`Senate index write HTTP ${r.status}`);});
  } catch(error){errors.push({document:'official_index',error:error.message});}
  const pending=await db('senate_disclosures?select=id,source_url&parse_status=eq.pending&order=filing_date.desc.nullslast,first_seen_at.asc&limit=3');
  const politicians=await db('politicians?select=id,display_name&chamber=eq.senate');
  const names=new Map(politicians.map(p=>[p.display_name.toLowerCase().trim(),p.id]));
  for(const queued of pending) {
    try {
      const doc=parseSenateDisclosure(await session.report(queued.source_url),queued.source_url);
      const trades=buildSenateTrades(doc,names.get(doc.filerName.toLowerCase().trim()) ?? null);
      const count=await db('rpc/replace_senate_disclosure',{p_document_id:doc.id,p_filer_name:doc.filerName,
        p_filing_date:doc.filingDate,p_trades:trades},'POST');
      transactions+=count;parsedDocuments++;
      console.log(JSON.stringify({document:doc.id,filingDate:doc.filingDate,transactions:count}));
    } catch(error) {
      errors.push({document:queued.id,error:error.message});
      await db(`senate_disclosures?id=eq.${queued.id}`,{parse_status:'error',parse_error:error.message},'PATCH');
    }
  }
  const [unreadable,latest]=await Promise.all([
    db('senate_disclosures?select=id&parse_status=eq.error'),
    db('senate_disclosures?select=filing_date&parse_status=eq.parsed&order=filing_date.desc&limit=1'),
  ]);
  const partial=errors.length>0 || unreadable.length>0;
  const status=await fetch(`${base}/rest/v1/investment_source_status?on_conflict=source`,{method:'POST',
    headers:{...headers,Prefer:'resolution=merge-duplicates'},body:JSON.stringify({source:'senate_efd',checked_at:checkedAt,
      latest_disclosure_date:latest[0]?.filing_date ?? null,status:partial?'partial':'ok',
      error:partial?JSON.stringify({unreadableDocuments:unreadable.length,errors}):null,
      ...((parsedDocuments>0 || !partial)?{last_success_at:new Date().toISOString()}:{}),
    }),signal:AbortSignal.timeout(45000)});
  if(!status.ok)throw Error(`Senate monitor HTTP ${status.status}`);
  console.log(JSON.stringify({parsedDocuments,transactions,partial,errors}));
} catch(error) {
  const status=await fetch(`${base}/rest/v1/investment_source_status?on_conflict=source`,{method:'POST',
    headers:{...headers,Prefer:'resolution=merge-duplicates'},body:JSON.stringify({source:'senate_efd',checked_at:checkedAt,
      status:'error',error:error.message}),signal:AbortSignal.timeout(45000)});
  if(!status.ok)console.error(`Senate monitor HTTP ${status.status}`);
  throw error;
}
