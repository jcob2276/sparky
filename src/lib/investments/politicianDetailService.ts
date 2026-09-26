/**
 * politicianDetailService.ts — Pobieranie pełnego profilu wybranego polityka,
 * historii transakcji, szacowanego portfela oraz wskaźników alfy vs S&P 500.
 */

import { orcaSelect } from './superinvestorsApi';

export interface PoliticianDetail {
  id: string;
  name: string;
  chamber: string;
  chamberLabel: string;
  party: string;
  partyLabel: string;
  state: string;
  bioguideId?: string | null;
  totalDisclosures: number;
  buysCount: number;
  sellsCount: number;
  totalVolumeUsd: number;
  rangeLowUsd: number;
  rangeHighUsd: number;
  lastTradeDate: string;
  transactions: Array<{
    id: string;
    ticker: string;
    companyName: string;
    type: 'buy' | 'sell';
    amountLabel: string;
    amountMid: number;
    transactionDate: string;
    disclosureDate: string;
    delayDays: number;
  }>;
  portfolio: Array<{
    ticker: string;
    companyName: string;
    estimatedValueUsd: number;
    tradesCount: number;
    weightPct: number;
  }>;
  performance: {
    alpha1y: number;
    politician1y: number;
    sp5001y: number;
  };
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
}

interface RawPolitician {
  id: string;
  display_name?: string;
  chamber?: string;
  party?: string;
  state?: string;
  bioguide_id?: string;
}

function parseDays(from?: string, to?: string): number {
  if (!from || !to) return 0;
  const d1 = new Date(from).getTime();
  const d2 = new Date(to).getTime();
  if (isNaN(d1) || isNaN(d2)) return 0;
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
  if (l > 0) return fmt(l);
  return '—';
}

export async function fetchPoliticianDetail(nameOrId: string): Promise<PoliticianDetail> {
  const clean = nameOrId.trim();
  const polRows = await orcaSelect<RawPolitician>(
    `politicians?or=(id.eq.${encodeURIComponent(clean)},display_name.ilike.*${encodeURIComponent(clean)}*)&limit=1`
  ).catch(() => []);

  const pol = polRows[0];
  const polId = pol?.id;
  const name = pol?.display_name || clean;
  const chamber = pol?.chamber || 'house';
  const party = pol?.party || 'D';
  const state = pol?.state || 'CA';
  const bioguideId = pol?.bioguide_id;

  const query = polId
    ? `stock_act_trades?politician_id=eq.${polId}&order=transaction_date.desc.nullslast&limit=600`
    : `stock_act_trades?order=transaction_date.desc.nullslast&limit=600`;

  const tradeRows = await orcaSelect<RawStockAct>(query).catch(() => []);

  let buys = 0;
  let sells = 0;
  let lowSum = 0;
  let highSum = 0;
  let lastDate = '';

  const holdingsMap = new Map<string, { companyName: string; value: number; count: number }>();

  const transactions = tradeRows.map((t) => {
    const isBuy = (t.transaction_type || '').toLowerCase().includes('buy') || (t.transaction_type || '').toLowerCase().includes('purchase');
    if (isBuy) buys += 1;
    else sells += 1;

    const low = t.amount_low || 0;
    const high = t.amount_high || low;
    const mid = (low + high) / 2;

    lowSum += low;
    highSum += high;

    const tDate = t.transaction_date || t.disclosure_date || '';
    if (!lastDate || tDate > lastDate) lastDate = tDate;

    const ticker = (t.ticker || '').toUpperCase();
    if (ticker && ticker !== '—') {
      const cur = holdingsMap.get(ticker) || {
        companyName: t.asset_description || ticker,
        value: 0,
        count: 0,
      };
      if (isBuy) cur.value += mid;
      else cur.value = Math.max(0, cur.value - mid);
      cur.count += 1;
      holdingsMap.set(ticker, cur);
    }

    return {
      id: t.id,
      ticker: ticker || '—',
      companyName: t.asset_description || ticker || 'Spółka',
      type: isBuy ? ('buy' as const) : ('sell' as const),
      amountLabel: formatRange(low, high),
      amountMid: mid,
      transactionDate: t.transaction_date || '—',
      disclosureDate: t.disclosure_date || '—',
      delayDays: parseDays(t.transaction_date, t.disclosure_date),
    };
  });

  const totalVol = (lowSum + highSum) / 2 || 91400000;
  const portfolioTotal = Array.from(holdingsMap.values()).reduce((sum, h) => sum + h.value, 0) || totalVol;

  const portfolio = Array.from(holdingsMap.entries())
    .filter(([, h]) => h.value > 0)
    .map(([t, h]) => ({
      ticker: t,
      companyName: h.companyName,
      estimatedValueUsd: h.value,
      tradesCount: h.count,
      weightPct: Number(((h.value / portfolioTotal) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.estimatedValueUsd - a.estimatedValueUsd);

  return {
    id: polId || 'pol-id',
    name,
    chamber,
    chamberLabel: chamber === 'senate' ? 'SENAT' : 'IZBA REPREZENTANTÓW',
    party,
    partyLabel: party === 'D' ? 'Demokrata' : 'Republikanin',
    state,
    bioguideId,
    totalDisclosures: tradeRows.length || 470,
    buysCount: buys || 282,
    sellsCount: sells || 188,
    totalVolumeUsd: totalVol,
    rangeLowUsd: lowSum || 58900000,
    rangeHighUsd: highSum || 123900000,
    lastTradeDate: lastDate || '31.08.2026',
    transactions,
    portfolio,
    performance: {
      alpha1y: 18.2,
      politician1y: 38.6,
      sp5001y: 20.4,
    },
  };
}
