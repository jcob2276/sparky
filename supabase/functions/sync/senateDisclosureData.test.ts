import { parseSenateDisclosure, senateDocumentUrl, parseSenateSearch } from './senateDisclosureData.ts';

const url = 'https://efdsearch.senate.gov/search/view/ptr/a0010f4a-c31a-4824-8b6d-6399b3ccb6f0/';
const fixture = await Deno.readTextFile(new URL('../../../scripts/tests/fixtures/senate-official-ptr.html', import.meta.url));

Deno.test('Senate official multirow report preserves numbered rows despite reverse display order', async () => {
  const html=await Deno.readTextFile(new URL('../../../scripts/tests/fixtures/senate-official-reversed-ptr.html',import.meta.url));
  const doc=parseSenateDisclosure(html,'https://efdsearch.senate.gov/search/view/ptr/272a44f0-e514-4d0a-993d-bc69316c77aa/');
  if(doc.rows.length!==13 || doc.rows[0].ticker!=='AMWD' || doc.rows[12].ticker!=='W'
    || doc.rows.some((row,index)=>row.rowIndex!==index+1))throw Error('Lost official row numbering');
  for(const changed of [html.replace('>13<','>12<'),html.replace('>13<','>14<')]) {
    let rejected=false;try{parseSenateDisclosure(changed,doc.sourceUrl);}catch{rejected=true;}
    if(!rejected)throw Error('Accepted duplicate or missing source row number');
  }
});

Deno.test('official Senate report separates filing date from trade date and preserves spouse', () => {
  const document = parseSenateDisclosure(fixture,url);
  if(document.filerName !== 'Ron L Wyden' || document.filingDate !== '2020-12-04'
    || document.rows.length !== 1 || document.rows[0].transactionDate !== '2020-11-10'
    || document.rows[0].owner !== 'spouse' || document.rows[0].ticker !== 'BYND'
    || document.rows[0].type !== 'sell' || document.rows[0].amountLow !== 50001
    || document.rows[0].amountHigh !== 100000) throw new Error('Lost primary disclosure evidence');
});

Deno.test('Senate source rejects invalid provenance and missing publication date', () => {
  for(const bad of ['https://example.com/search/view/ptr/a0010f4a-c31a-4824-8b6d-6399b3ccb6f0/',
    'https://efdsearch.senate.gov/search/view/ptr/not-an-id/', 'http://efdsearch.senate.gov/search/view/ptr/a0010f4a-c31a-4824-8b6d-6399b3ccb6f0/']) {
    let failed = false;try { senateDocumentUrl(bad); } catch { failed = true; }
    if(!failed) throw new Error('Accepted invalid official URL');
  }
  let failed = false;
  try {parseSenateDisclosure(fixture.replace('Filed  12/04/2020','No publication date'),url);} catch {failed=true;}
  if(!failed) throw new Error('Invented filing date');
});

Deno.test('Senate source preserves nonlisted assets and unknown transaction types', () => {
  const changed=fixture.replaceAll('BYND','N/A').replace('Sale (Full)','Gift');
  const row=parseSenateDisclosure(changed,url).rows[0];
  if(row.ticker !== null || row.type !== 'other') throw new Error('Guessed a ticker or sale');
});

Deno.test('Senate source rejects incomplete reports and future transaction dates', () => {
  for(const changed of [fixture.replace('(1 transaction total)','(2 transactions total)'),
    fixture.replace('11/10/2020','12/05/2020'), fixture.replace('$50,001 - $100,000','unreadable')]) {
    let failed=false;try{parseSenateDisclosure(changed,url);}catch{failed=true;}
    if(!failed)throw new Error('Accepted incomplete/invalid report');
  }
});

Deno.test('official Senate search preserves UUID and publication date', () => {
  const docs=parseSenateSearch({data:[['Ron','Wyden','Senator',`<a href="${new URL(url).pathname}">Periodic Transaction Report</a>`,'12/04/2020']],recordsFiltered:1});
  if(docs.length!==1 || docs[0].sourceUrl!==url || docs[0].filingDate!=='2020-12-04')throw new Error('Lost index provenance');
});
