/**
 * congressService.ts — Serwis danych Kongresu USA (STOCK Act).
 * Zapewnia podsumowania najczęściej kupowanych/sprzedawanych, największych transakcji,
 * zwrotów na partie oraz rankingu alfy vs S&P 500.
 */

import { orcaSelect } from './superinvestorsApi';
import { getTodayWarsaw, shiftDateStr } from '../date';
import { detectCongressClusterBuys, type ClusterBuyAlert, type ClusterTradeInput } from './congressClusterService';
export { fetchPoliticianDetail, type PoliticianDetail } from './politicianDetailService';

export interface CongressOverview {
  coverage: { fetchedRows: number; limited: boolean };
  topBought: Array<{ ticker: string; companyName: string; count: number; volumeUsd: number }>;
  topSold: Array<{ ticker: string; companyName: string; count: number; volumeUsd: number }>;
  clusterBuys: ClusterBuyAlert[];
  largestTrades: Array<{
    politicianName: string;
    bioguideId?: string | null;
    ticker: string;
    type: 'buy' | 'sell';
    volumeUsd: number;
    amountLabel: string;
  }>;
  partyReturns: {
    democrats: { pct: number | null; tradesCount: number; volumeUsd: number };
    republicans: { pct: number | null; tradesCount: number; volumeUsd: number };
  };
  rankings: Array<{
    id: string;
    name: string;
    bioguideId?: string | null;
    chamber: string;
    party: string;
    state: string;
    tradesCount: number;
    alpha3m: number;
    alpha6m: number;
    alpha12m: number;
  }>;
  stream: Array<{
    id: string;
    politicianId: string;
    politicianName: string;
    bioguideId?: string | null;
    chamber: string;
    party: string;
    state: string;
    ticker: string;
    companyName: string;
    type: 'buy' | 'sell' | 'exchange' | 'other';
    amountLow: number;
    amountHigh: number;
    amountLabel: string;
    transactionDate: string;
    disclosureDate: string;
    delayDays: number | null;
    owner: string | null;
    sourceUrl: string | null;
  }>;
}

interface RawStockAct {
  id: string;
  politician_id?: string;
  ticker?: string;
  asset_description?: string;
  transaction_date?: string;
  disclosure_date?: string;
  transaction_type?: string;
  amount_low?: number;
  amount_high?: number;
  external_id?: string;
  filer_name?: string;
  chamber?: string;
  owner?: string;
  source_url?: string;
}

interface RawPolitician {
  id: string;
  display_name?: string;
  chamber?: string;
  party?: string;
  state?: string;
  bioguide_id?: string;
}

function parseDaysBetween(from?: string, to?: string): number | null {
  if (!from || !to) return null;
  const d1 = new Date(from).getTime();
  const d2 = new Date(to).getTime();
  if (isNaN(d1) || isNaN(d2) || d2 < d1) return null;
  return Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
}

function formatRange(low?: number, high?: number): string {
  const l = low || 0;
  const h = high || 0;
  const fmt = (val: number) => {
    if (val >= 1e6) return `${(val / 1e6).toFixed(1).replace('.', ',')} mln USD`;
    if (val >= 1e3) return `${(val / 1e3).toFixed(1).replace('.', ',')} tys USD`;
    return `${val} USD`;
  };
  if (l > 0 && h > 0) return `${fmt(l)} - ${fmt(h)}`;
  if (h > 0) return fmt(h);
  if (l > 0) return `od ${fmt(l)}`;
  return '—';
}

export async function fetchCongressOverview(options?: {
  chamber?: 'all' | 'house' | 'senate'; party?: 'all' | 'D' | 'R';
  timeframe?: '90' | '365' | 'all'; searchQuery?: string; tickerQuery?: string;
}): Promise<CongressOverview> {
  const cutoff = options?.timeframe === '90' ? shiftDateStr(getTodayWarsaw(), -90)
    : options?.timeframe === '365' ? shiftDateStr(getTodayWarsaw(), -365) : null;
  const [tradeRows, polRows, documents] = await Promise.all([
    orcaSelect<RawStockAct>(`stock_act_trades?order=disclosure_date.desc.nullslast,id.asc${cutoff ? `&disclosure_date=gte.${cutoff}` : ''}`, { strict: true }),
    orcaSelect<RawPolitician>('politicians?select=id,display_name,chamber,party,state,bioguide_id', { strict: true }),
    orcaSelect<{ doc_id: string; source_url: string }>('house_disclosures?select=doc_id,source_url', { strict: true }),
  ]);
  const polMap = new Map(polRows.map((p) => [p.id, p]));
  const documentUrls = new Map(documents.map((doc) => [doc.doc_id, doc.source_url]));
  const stream: CongressOverview['stream'] = [];
  const boughtStats = new Map<string, { companyName: string; count: number; volumeUsd: number }>();
  const soldStats = new Map<string, { companyName: string; count: number; volumeUsd: number }>();
  const clusterTrades: ClusterTradeInput[] = [];
  const clusterCutoff = shiftDateStr(getTodayWarsaw(), -14);
  const partyReturns = {
    democrats: { pct: null, tradesCount: 0, volumeUsd: 0 },
    republicans: { pct: null, tradesCount: 0, volumeUsd: 0 },
  };
  for (const trade of tradeRows) {
    const politician = trade.politician_id ? polMap.get(trade.politician_id) : undefined;
    const name = politician?.display_name || trade.filer_name || 'Nieustalony zgłaszający';
    const chamber = politician?.chamber || trade.chamber || '';
    const party = politician?.party || '';
    const ticker = (trade.ticker || '').toUpperCase();
    if (options?.chamber && options.chamber !== 'all' && chamber !== options.chamber) continue;
    if (options?.party && options.party !== 'all' && party !== options.party) continue;
    if (cutoff && (!trade.disclosure_date || trade.disclosure_date < cutoff)) continue;
    if (options?.searchQuery && !name.toLowerCase().includes(options.searchQuery.toLowerCase())) continue;
    if (options?.tickerQuery && !`${ticker} ${trade.asset_description || ''}`.toUpperCase().includes(options.tickerQuery.toUpperCase())) continue;
    const rawType = (trade.transaction_type || '').toLowerCase().trim();
    const type = /^(buy|purchase|p)$/.test(rawType) ? 'buy'
      : /^(sell|sale|s)\b/.test(rawType) ? 'sell' : /^(exchange|e)$/.test(rawType) ? 'exchange' : 'other';
    const mid = trade.amount_low != null && trade.amount_high != null
      ? (trade.amount_low + trade.amount_high) / 2 : 0;
    const group = party === 'D' ? partyReturns.democrats : party === 'R' ? partyReturns.republicans : null;
    if (group) { group.tradesCount++; group.volumeUsd += mid; }
    if (ticker && ticker !== '—' && (type === 'buy' || type === 'sell')) {
      const target = type === 'buy' ? boughtStats : soldStats;
      const aggregate = target.get(ticker) ?? { companyName: trade.asset_description || ticker, count: 0, volumeUsd: 0 };
      aggregate.count++; aggregate.volumeUsd += mid; target.set(ticker, aggregate);
      if (type === 'buy' && trade.disclosure_date && trade.disclosure_date >= clusterCutoff
        && (politician?.id || trade.filer_name)) clusterTrades.push({
        politicianId: politician?.id || trade.politician_id, politicianName: name, party, chamber,
        state: politician?.state, bioguideId: politician?.bioguide_id, ticker,
        companyName: trade.asset_description || ticker, type: 'buy', amountUsd: mid, date: trade.disclosure_date,
      });
    }
    const houseDocumentId = /^house-clerk\|(\d+)\|/.exec(trade.external_id || '')?.[1];
    const sourceUrl = trade.source_url || (houseDocumentId ? documentUrls.get(houseDocumentId) : null)
      || (/^https:\/\//.test(trade.external_id || '') ? trade.external_id : null);
    stream.push({ id: trade.id, politicianId: politician?.id || trade.politician_id || '',
      politicianName: name, bioguideId: politician?.bioguide_id, chamber, party, state: politician?.state || '',
      ticker: ticker || '—', companyName: trade.asset_description || ticker || 'Nieopisany instrument', type,
      amountLow: trade.amount_low || 0, amountHigh: trade.amount_high || 0,
      amountLabel: formatRange(trade.amount_low, trade.amount_high),
      transactionDate: trade.transaction_date || '', disclosureDate: trade.disclosure_date || '',
      delayDays: parseDaysBetween(trade.transaction_date, trade.disclosure_date),
      owner: trade.owner || null, sourceUrl: sourceUrl?.startsWith('https://') ? sourceUrl : null,
    });
  }
  const summarize = (stats: typeof boughtStats) => [...stats.entries()]
    .map(([ticker, data]) => ({ ticker, ...data })).sort((a, b) => b.count - a.count).slice(0, 3);
  const largestTrades = [...stream].filter((t) => t.type === 'buy' || t.type === 'sell')
    .sort((a, b) => b.amountHigh - a.amountHigh).slice(0, 3).map((t) => ({
      politicianName: t.politicianName, bioguideId: t.bioguideId, ticker: t.ticker,
      type: t.type as 'buy' | 'sell', volumeUsd: t.amountHigh, amountLabel: t.amountLabel,
    }));
  return { coverage: { fetchedRows: tradeRows.length, limited: tradeRows.length >= 20_000 },
    topBought: summarize(boughtStats), topSold: summarize(soldStats), largestTrades,
    clusterBuys: detectCongressClusterBuys(clusterTrades), partyReturns, rankings: [], stream };
}
