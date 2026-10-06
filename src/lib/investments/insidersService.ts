/**
 * insidersService.ts — Agregacja i analityka transakcji insiderów SEC Form 4.
 * 100% otwarty dostęp: bez rozmyć (blur), bez paywalli „Pro”.
 */

import { orcaSelect } from './superinvestorsApi';

export interface InsiderSummaryStats {
  purchasesCount: number;
  salesCount: number;
  marketPurchases90d: number;
  marketSales90d: number;
  marketDeltaPoints: string;
  mostActiveTicker: string;
  mostActiveFilingCount: number;
  medianPerCompany: number;
  runRate30d: number;
  avgMonthly90d: number;
  runRateGrowthPct: string;
}

export interface InsiderClusterItem {
  id: string;
  ticker: string;
  companyName: string;
  buyersCount: number;
  tradesCount: number;
  totalValueFormatted: string;
  dateRange: string;
  insiderNames: string[];
}

export interface InsiderIntensityRow {
  ticker: string;
  companyName: string;
  weeklyCounts: number[]; // 12 tygodni
  total: number;
}

export interface InsiderFeedItem {
  id: string;
  transactionDate?: string | null;
  docUrl?: string | null;
  accession?: string | null;
  formType?: string | null;
  filingDate: string;
  ticker: string;
  companyName: string;
  insiderName: string;
  insiderTitle?: string;
  transactionType: 'purchase' | 'sale' | 'option' | 'direct' | 'award';
  typeBadgeLabel: string;
  shares: number | null;
  sharesFormatted: string;
  priceUsd: number | null;
  priceFormatted: string;
  valueUsd: number | null;
  valueFormatted: string;
}

export interface InsidersPageData {
  coverage?: string;
  stats: InsiderSummaryStats;
  intensityRows: InsiderIntensityRow[];
  clusters: InsiderClusterItem[];
  topSinglePurchases: string;
  feed: InsiderFeedItem[];
}

export interface RawPublicInsider {
  id: string; ticker?: string | null; company_name?: string | null; filer_name?: string | null;
  filer_id?: string | null; insider_title?: string | null; transaction_code?: string | null;
  transaction_date?: string | null; filing_date?: string | null; shares?: number | null;
  price_usd?: number | null; value_usd?: number | null; doc_url?: string | null;
  accession?: string | null; is_derivative?: boolean | null; form_type?: string | null;
}
const number = (n: number | null | undefined): number | null => n != null && Number.isFinite(Number(n)) ? Number(n) : null;
const money = (n: number | null): string => n == null ? '—' : `$${n.toLocaleString('pl-PL', { maximumFractionDigits: 2 })}`;
const ownerKey = (r: RawPublicInsider) => r.filer_id || r.filer_name || r.id;
export function buildInsidersPageData(rawRows: RawPublicInsider[], now = new Date()): InsidersPageData {
  const cutoff = now.getTime() - 90 * 86400000;
  const rows = rawRows.filter(r => r.filing_date && Date.parse(r.filing_date) >= cutoff && Date.parse(r.filing_date) <= now.getTime());
  const feed: InsiderFeedItem[] = rows.slice(0, 100).map(r => {
    const code = r.transaction_code || '—';
    const type: InsiderFeedItem['transactionType'] = code === 'P' ? 'purchase' : code === 'S' ? 'sale' : ['M', 'O'].includes(code) ? 'option' : code === 'A' ? 'award' : 'direct';
    const shares = number(r.shares); const price = number(r.price_usd); const value = number(r.value_usd);
    return { id: r.id, ticker: r.ticker || '—', companyName: r.company_name || '—',
      filingDate: r.filing_date || '—', transactionDate: r.transaction_date ?? null,
      insiderName: r.filer_name || '—', insiderTitle: r.insider_title || undefined,
      transactionType: type, typeBadgeLabel: ({ P:'Kupno (P)', S:'Sprzedaż (S)', M:'Wykonanie opcji (M)', A:'Przyznanie (A)' } as Record<string,string>)[code] || code,
      shares, sharesFormatted: shares == null ? '—' : shares.toLocaleString('pl-PL'), priceUsd: price, priceFormatted: money(price), valueUsd: value, valueFormatted: money(value),
      docUrl: r.doc_url ?? null, accession: r.accession ?? null, formType: r.form_type ?? null,
    };
  });
  // Amendments remain visible as evidence, but are not blindly added to original transactions in aggregates.
  const measured = rows.filter(r => r.form_type !== '4/A' && !r.is_derivative);
  const purchases = measured.filter(r => r.transaction_code === 'P');
  const sales = measured.filter(r => r.transaction_code === 'S');
  const byTicker = new Map<string, RawPublicInsider[]>();
  measured.forEach(r => { if (r.ticker) byTicker.set(r.ticker, [...(byTicker.get(r.ticker) || []),r]); });
  const companies = [...byTicker.entries()].sort((a,b)=>b[1].length-a[1].length);
  const frequencies = companies.map(([,rs])=>rs.length).sort((a,b)=>a-b);
  const midpoint = Math.floor(frequencies.length/2);
  const median = frequencies.length ? (frequencies.length % 2 ? frequencies[midpoint] : (frequencies[midpoint-1]+frequencies[midpoint])/2) : 0;
  const intensityRows = companies.slice(0,12).map(([ticker, rs]) => {
    const weeks = Array<number>(13).fill(0);
    rs.filter(r => r.transaction_code === 'P').forEach(r => {
      if (!r.transaction_date) return;
      const age = now.getTime() - Date.parse(r.transaction_date);
      const bucket = 12 - Math.floor(age / (7 * 86400000));
      if (age >= 0 && age <= 90 * 86400000 && bucket >= 0 && bucket < 13) weeks[bucket]++;
    });
    return { ticker, companyName:rs[0].company_name || ticker, weeklyCounts:weeks, total:weeks.reduce((a,b)=>a+b,0) };
  }).filter(r=>r.total>0);
  const clusters: InsiderClusterItem[] = [];
  for (const [ticker, rs] of companies) {
    const buys = rs.filter(r=>r.transaction_code==='P' && r.transaction_date && Date.parse(r.transaction_date) >= cutoff).sort((a,b)=>a.transaction_date!.localeCompare(b.transaction_date!));
    let i=0;
    while (i < buys.length) {
      const group = buys.slice(i).filter(r=>Date.parse(r.transaction_date!)-Date.parse(buys[i].transaction_date!) <= 14*86400000);
      const owners = new Set(group.map(ownerKey));
      if (owners.size >= 2) {
        const known = group.map(r=>number(r.value_usd)).filter((v):v is number=>v!=null);
        clusters.push({ id:`${ticker}:${buys[i].transaction_date}`, ticker, companyName:buys[i].company_name || ticker,
          buyersCount:owners.size, tradesCount:group.length, totalValueFormatted: known.length ? `${money(known.reduce((a,b)=>a+b,0))}${known.length < group.length ? ' (niepełna)' : ''}` : '—',
          dateRange:`${group[0].transaction_date} – ${group[group.length-1].transaction_date}`, insiderNames:[...new Set(group.map(r=>r.filer_name || '—'))],
        });
        i += group.length;
      } else i++;
    }
  }
  const last30 = measured.filter(r=>Date.parse(r.filing_date!)>=now.getTime()-30*86400000).length;
  const avgMonthly = measured.length/3;
  const totalMarket = purchases.length+sales.length;
  return {
    stats:{ purchasesCount:purchases.length, salesCount:sales.length, marketPurchases90d:purchases.length, marketSales90d:sales.length,
      marketDeltaPoints:totalMarket ? `${Math.round(purchases.length/totalMarket*100)}% kupna` : '—', mostActiveTicker:companies[0]?.[0] || '—',
      mostActiveFilingCount:companies[0]?.[1].length || 0, medianPerCompany:median, runRate30d:last30, avgMonthly90d:Math.round(avgMonthly),
      runRateGrowthPct:avgMonthly ? `${((last30/avgMonthly-1)*100).toFixed(1)}%` : '—' },
    clusters, intensityRows, feed,
    topSinglePurchases:purchases.filter(r=>number(r.value_usd)!=null).sort((a,b)=>Number(b.value_usd)-Number(a.value_usd)).slice(0,5).map(r=>`${r.ticker || '—'} ${money(number(r.value_usd))}`).join(' · ') || 'Brak zakupów z podaną wartością',
  };
}
export async function fetchInsidersPageData(): Promise<InsidersPageData> {
  const date = new Date(Date.now()-90*86400000).toISOString().slice(0,10);
  const [rows, statuses] = await Promise.all([
    orcaSelect<RawPublicInsider>(`vw_sec_form4_public?filing_date=gte.${date}&order=filing_date.desc,id.desc`, { strict:true }),
    orcaSelect<{ queued_filings: number; failed_filings: number; latest_processed_filing: string | null; last_processed_at: string | null }>('vw_sec_form4_status?limit=1', { strict:true }),
  ]);
  const status = statuses[0];
  const data = buildInsidersPageData(rows);
  return { ...data, coverage: `SEC Form 4: ${rows.length} zapisanych transakcji w oknie 90 dni. Statystyki dotyczą pobranej próby, nie całego rynku.${rows.length >= 20000 ? ' Osiągnięto limit odczytu 20 000.' : ''} Ostatnie przetworzone zgłoszenie: ${status?.latest_processed_filing || 'brak'}. Synchronizacja: ${status?.last_processed_at || 'brak'}. Kolejka: ${status?.queued_filings ?? '—'}, błędy: ${status?.failed_filings ?? '—'}. Korekty 4/A i instrumenty pochodne są widoczne w tabeli, wyłączone z agregatów.` };
}
