/**
 * politicianDetailService.ts — profil polityka wyłącznie z ujawnień STOCK Act z bieżącego roku
 * (od 1 stycznia, Europe/Warsaw): transakcje, widełki kwot, hipotetyczny portfel i opóźnienie zgłoszeń.
 * Bez alfy: baza nie ma cen dla większości tickerów z ujawnień, więc nie zgadujemy wyniku.
 */

import { orcaSelect } from './superinvestorsApi';
import { yearFloor } from './yearFloor';
import { classifyTradeType, daysBetween, formatAmountRange, median, STOCK_ACT_DEADLINE_DAYS } from './congressTradeFormat';

export interface PoliticianDetail {
  id: string;
  name: string;
  chamber: string;
  chamberLabel: string;
  party: string;
  partyLabel: string;
  state: string;
  bioguideId?: string | null;
  /** Początek okna danych (YYYY-MM-DD) — 1 stycznia bieżącego roku. */
  since: string;
  totalDisclosures: number;
  buysCount: number;
  sellsCount: number;
  totalVolumeUsd: number;
  rangeLowUsd: number;
  rangeHighUsd: number;
  lastTradeDate: string;
  lastDisclosureDate: string;
  medianDelayDays: number | null;
  lateCount: number;
  transactions: Array<{
    id: string;
    ticker: string;
    companyName: string;
    type: 'buy' | 'sell';
    amountLabel: string;
    amountMid: number;
    transactionDate: string;
    disclosureDate: string;
    delayDays: number | null;
    sourceUrl: string | null;
  }>;
  portfolio: Array<{
    ticker: string;
    companyName: string;
    estimatedValueUsd: number;
    tradesCount: number;
    weightPct: number;
  }>;
}

interface RawStockAct {
  id: string;
  ticker?: string;
  asset_description?: string;
  transaction_date?: string;
  disclosure_date?: string;
  transaction_type?: string;
  amount_low?: number;
  amount_high?: number;
  filer_name?: string;
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

const DETAIL_SELECT = 'id,ticker,asset_description,transaction_date,disclosure_date,transaction_type,amount_low,amount_high,filer_name,source_url';

function partyLabel(party: string): string {
  return party === 'D' ? 'Demokrata' : party === 'R' ? 'Republikanin' : 'Brak danych o partii';
}

export async function fetchPoliticianDetail(nameOrId: string): Promise<PoliticianDetail> {
  const clean = nameOrId.trim();
  const safe = clean.replace(/[%_,()*"\\]/g, ' ').trim();
  const since = yearFloor();
  const polRows = await orcaSelect<RawPolitician>(
    `politicians?select=id,display_name,chamber,party,state,bioguide_id&or=(id.eq.${encodeURIComponent(safe)},display_name.ilike.*${encodeURIComponent(safe)}*)&limit=1`,
    { strict: true },
  );
  const pol = polRows[0];
  const owner = pol?.id && /^[a-z0-9_-]+$/i.test(pol.id)
    ? `politician_id=eq.${pol.id}`
    : `filer_name=ilike.*${encodeURIComponent(safe)}*`;
  const tradeRows = await orcaSelect<RawStockAct>(
    `stock_act_trades?select=${DETAIL_SELECT}&${owner}&disclosure_date=gte.${since}&order=transaction_date.desc.nullslast,id.asc&limit=600`,
    { strict: true },
  );

  let buys = 0; let sells = 0; let lowSum = 0; let highSum = 0; let lastTrade = ''; let lastDisclosure = '';
  const delays: number[] = [];
  const holdings = new Map<string, { companyName: string; value: number; count: number }>();

  const transactions = tradeRows.map((t) => {
    const kind = classifyTradeType(t.transaction_type);
    const isBuy = kind === 'buy';
    if (isBuy) buys += 1; else if (kind === 'sell') sells += 1;
    const low = t.amount_low || 0;
    const high = t.amount_high || low;
    const mid = (low + high) / 2;
    lowSum += low; highSum += high;
    if (t.transaction_date && t.transaction_date > lastTrade) lastTrade = t.transaction_date;
    if (t.disclosure_date && t.disclosure_date > lastDisclosure) lastDisclosure = t.disclosure_date;
    const delay = daysBetween(t.transaction_date, t.disclosure_date);
    if (delay != null) delays.push(delay);

    const ticker = (t.ticker || '').toUpperCase();
    if (ticker && ticker !== '—' && (isBuy || kind === 'sell')) {
      const cur = holdings.get(ticker) || { companyName: t.asset_description || ticker, value: 0, count: 0 };
      cur.value = isBuy ? cur.value + mid : Math.max(0, cur.value - mid);
      cur.count += 1;
      holdings.set(ticker, cur);
    }
    return {
      id: t.id, ticker: ticker || '—', companyName: t.asset_description || ticker || 'Nieopisany instrument',
      type: isBuy ? ('buy' as const) : ('sell' as const), amountLabel: formatAmountRange(low, high), amountMid: mid,
      transactionDate: t.transaction_date || '', disclosureDate: t.disclosure_date || '', delayDays: delay,
      sourceUrl: t.source_url?.startsWith('https://') ? t.source_url : null,
    };
  });

  const portfolioTotal = Array.from(holdings.values()).reduce((sum, h) => sum + h.value, 0);
  const portfolio = Array.from(holdings.entries())
    .filter(([, h]) => h.value > 0)
    .map(([ticker, h]) => ({
      ticker, companyName: h.companyName, estimatedValueUsd: h.value, tradesCount: h.count,
      weightPct: portfolioTotal > 0 ? Number(((h.value / portfolioTotal) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.estimatedValueUsd - a.estimatedValueUsd);

  const chamber = pol?.chamber || '';
  const party = pol?.party || '';
  return {
    id: pol?.id || clean, name: pol?.display_name || tradeRows[0]?.filer_name || clean, chamber,
    chamberLabel: chamber === 'senate' ? 'SENAT' : chamber === 'house' ? 'IZBA REPREZENTANTÓW' : 'KONGRES',
    party, partyLabel: partyLabel(party), state: pol?.state || '', bioguideId: pol?.bioguide_id, since,
    totalDisclosures: tradeRows.length, buysCount: buys, sellsCount: sells,
    totalVolumeUsd: (lowSum + highSum) / 2, rangeLowUsd: lowSum, rangeHighUsd: highSum,
    lastTradeDate: lastTrade, lastDisclosureDate: lastDisclosure,
    medianDelayDays: median(delays), lateCount: delays.filter((d) => d > STOCK_ACT_DEADLINE_DAYS).length,
    transactions, portfolio,
  };
}
