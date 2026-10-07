import { DOMParser } from 'npm:linkedom@0.18.12/worker';
import { houseDate } from './houseDisclosureData.ts';

const root = 'https://efdsearch.senate.gov';
const clean = (node: { textContent: string | null } | null) => (node?.textContent ?? '').replace(/\s+/g,' ').trim();

export function senateDocumentUrl(raw: string): { id: string; sourceUrl: string } {
  const url = new URL(raw,root);
  const id = /^\/search\/view\/ptr\/([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})\/$/.exec(url.pathname)?.[1];
  if(url.origin !== root || !id || url.search || url.hash || url.username || url.password)
    throw new Error('Niepoprawny oficjalny adres raportu Senatu');
  return { id,sourceUrl:url.href };
}

function amountRange(raw: string) {
  const range = /^\$([\d,]+)\s*-\s*\$([\d,]+)$/.exec(raw);
  if(range) {
    const low=Number(range[1].replaceAll(',',''));const high=Number(range[2].replaceAll(',',''));
    if(Number.isSafeInteger(low) && Number.isSafeInteger(high) && low>0 && high>=low)
      return { amountLow:low,amountHigh:high };
  }
  const open = /^Over\s+\$([\d,]+)$/i.exec(raw);
  if(open) {
    const low=Number(open[1].replaceAll(',',''))+1;
    if(Number.isSafeInteger(low) && low>1) return { amountLow:low,amountHigh:null };
  }
  throw new Error('Nieczytelny przedział kwoty w raporcie Senatu');
}

export function parseSenateDisclosure(html: string,rawUrl: string) {
  const identity=senateDocumentUrl(rawUrl);
  const document=new DOMParser().parseFromString(html,'text/html');
  const filed=/\bFiled\s+(\d{1,2}\/\d{1,2}\/\d{4})\s*@/.exec(clean(document.body));
  const filingDate=houseDate(filed?.[1] ?? '');
  const filerName=clean(document.querySelector('h2.filedReport'))
    .replace(/^The Honorable\s+/,'').replace(/\s*\([^)]*\)\s*$/,'').trim();
  if(!filingDate || !filerName || !clean(document.querySelector('h1')).includes('Periodic Transaction Report'))
    throw new Error('Brak oficjalnej daty ujawnienia lub zgłaszającego Senatu');
  const headers='#|Transaction Date|Owner|Ticker|Asset Name|Asset Type|Type|Amount|Comment';
  const table=[...document.querySelectorAll('table')].find(t => [...t.querySelectorAll('thead th')].map(clean).join('|')===headers);
  if(!table)throw new Error('Nie rozpoznano oficjalnej tabeli transakcji Senatu');
  const expected=Number(/\((\d+) transactions? total\)/.exec(clean(document.body))?.[1]);
  // The portal displays newest transactions first, reversing printed row numbers.
  const numberedRows=[...table.querySelectorAll('tbody tr')].map(row=>[...row.querySelectorAll('td')].map(clean));
  const rows=numberedRows.sort((a,b)=>Number(a[0])-Number(b[0])).map((cells,index) => {
    if(cells.length!==9 || Number(cells[0])!==index+1)throw new Error('Niekompletny wiersz Senatu');
    const transactionDate=houseDate(cells[1]);
    if(!transactionDate || transactionDate>filingDate || !cells[4])throw new Error('Niepoprawna transakcja Senatu');
    const ticker=/^[A-Z][A-Z0-9.\-]{0,9}$/.test(cells[3]) && !['NA','N/A','--'].includes(cells[3]) ? cells[3] : null;
    const owner=({'Self':'self','Joint':'joint','Spouse':'spouse','Dependent Child':'dependent_child'} as Record<string,string>)[cells[2]] ?? 'unknown';
    const type=cells[6]==='Purchase' ? 'buy' : /^Sale \((Full|Partial)\)$/.test(cells[6]) ? 'sell'
      : cells[6]==='Exchange' ? 'exchange' : 'other';
    return { rowIndex:index+1,transactionDate,owner,ticker,asset:cells[4],assetType:cells[5],type,...amountRange(cells[7]) };
  });
  if(!Number.isInteger(expected) || expected<1 || rows.length!==expected)
    throw new Error('Liczba transakcji nie zgadza się z nagłówkiem raportu Senatu');
  return {...identity,filerName,filingDate,rows};
}

export function parseSenateSearch(raw: unknown) {
  const result=raw as { data?: unknown };
  if(!Array.isArray(result?.data))throw new Error('Niepoprawny oficjalny indeks Senatu');
  return result.data.map((row: unknown) => {
    if(!Array.isArray(row) || row.length!==5 || row.some(cell => typeof cell!=='string'))
      throw new Error('Niepoprawny wiersz indeksu Senatu');
    const link=new DOMParser().parseFromString(row[3],'text/html').querySelector('a[href]');
    const identity=senateDocumentUrl(link?.getAttribute('href') ?? '');
    const filingDate=houseDate(row[4]);
    if(!filingDate)throw new Error('Brak daty ujawnienia w indeksie Senatu');
    return {...identity,filingDate};
  });
}

export function buildSenateTrades(doc: ReturnType<typeof parseSenateDisclosure>,politicianId: string|null=null) {
  return doc.rows.map(row=>({id:`senate-efd-${doc.id}-${row.rowIndex}`,politician_id:politicianId,
    filer_name:doc.filerName,chamber:'senate',ticker:row.ticker,asset_description:row.asset,
    transaction_date:row.transactionDate,disclosure_date:doc.filingDate,transaction_type:row.type,
    owner:row.owner,amount_low:row.amountLow,amount_high:row.amountHigh,source:'senate_efd',
    source_url:doc.sourceUrl,external_id:`senate-efd|${doc.id}|${row.rowIndex}`}));
}
