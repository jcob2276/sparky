import { syncSecForm4 } from './secForm4Sync.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
function assert(condition: boolean, message: string) { if (!condition) throw new Error(message); }
Deno.test('SEC sync discovers all-issuer filing, persists only reported transaction and marks processed after upsert', async () => {
 const originalFetch = globalThis.fetch; const originalAgent = Deno.env.get('SEC_USER_AGENT');
 Deno.env.set('SEC_USER_AGENT','Sparky test contact@example.com');
 const accession='0001234567-26-000001';
 const submissionUrl='https://www.sec.gov/Archives/edgar/data/123/000123456726000001/0001234567-26-000001.txt';
 const filing={accession,filing_date:'2026-10-05',form_type:'4',submission_url:submissionUrl,status:'pending',attempts:0};
 let stored: Record<string,unknown>[]=[]; const updates: Record<string,unknown>[]=[]; let discovered: Record<string,unknown>[]=[];
 const db = { from(table:string) { return {
  upsert(rows:Record<string,unknown>[]) { if(table==='insider_trades') stored=rows; else discovered=rows; return Promise.resolve({error:null}); },
  select(_columns:string, options?: {head:boolean}) {
   if(options?.head) return {neq:()=>Promise.resolve({count:0,error:null})};
   return {in:()=>({lt:()=>({order:()=>({limit:()=>Promise.resolve({data:[filing],error:null})})})})};
  },
  update(value:Record<string,unknown>) { updates.push(value); return {eq:()=>Promise.resolve({error:null})}; },
 }; } } as unknown as SupabaseClient;
 globalThis.fetch = ((input: string | URL | Request) => {
  const url=String(input);
  if(url.includes('browse-edgar')) return Promise.resolve(new Response(`<feed><entry><category term="4"/><updated>2026-10-05T20:00:00Z</updated><link href="https://www.sec.gov/Archives/edgar/data/123/000123456726000001/${accession}-index.htm"/></entry></feed>`));
  if(url.includes('daily-index')) return Promise.resolve(new Response('',{status:404}));
  if(url===submissionUrl) return Promise.resolve(new Response(`<DOCUMENT>\n<TYPE>4\n<FILENAME>owner.xml\n<XML><ownershipDocument><documentType>4</documentType><issuer><issuerTradingSymbol>REAL</issuerTradingSymbol></issuer><reportingOwner><reportingOwnerId><rptOwnerName>Actual Owner</rptOwnerName></reportingOwnerId></reportingOwner><nonDerivativeTransaction><transactionCoding><transactionCode>P</transactionCode></transactionCoding><transactionAmounts><transactionShares><value>50</value></transactionShares></transactionAmounts></nonDerivativeTransaction></ownershipDocument></XML>\n</DOCUMENT>`));
  throw new Error(`Unexpected source URL ${url}`);
 }) as typeof fetch;
 try {
  const result=await syncSecForm4(db,{limit:1,days:1});
  assert(result.synced===1,'Expected one genuine transaction'); assert(discovered[0].accession===accession,'Accession must originate in all-issuer feed');
  assert(stored[0].filer_name==='Actual Owner' && stored[0].price_usd===null,'Persist reported owner without invented price');
  assert(stored[0].doc_url==='https://www.sec.gov/Archives/edgar/data/123/000123456726000001/owner.xml','Document URL must locate original SEC XML');
  assert(updates[0].status==='processed','Durable queue must complete only after transaction storage');
 } finally { globalThis.fetch=originalFetch; if(originalAgent) Deno.env.set('SEC_USER_AGENT',originalAgent); else Deno.env.delete('SEC_USER_AGENT'); }
});
