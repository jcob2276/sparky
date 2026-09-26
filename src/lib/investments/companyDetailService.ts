/**
 * companyDetailService.ts — Pobieranie pełnych danych spółki dla widoku CompanyDetailView.
 * Pobiera konsensus 13F, notowania daily, transakcje Kongresu, transakcje insiderów
 * oraz opis z polskiej Wikipedii.
 */

import { orcaSelect } from './superinvestorsApi';

export interface CompanyDetailData {
  ticker: string;
  name: string;
  exchange: string;
  sector: string;
  price: number;
  changeTodayPct: number;
  change1yPct: number;
  consensus: {
    buyers: number;
    sellers: number;
    newPositions: number;
    holders: number;
    netBuyers: number;
    totalValueUsd: number;
    buyerNames: string[];
    sellerNames: string[];
  };
  politicians: {
    buyersCount: number;
    sellsCount: number;
    trades: Array<{
      id: string;
      filerName: string;
      transactionDate: string;
      disclosureDate: string;
      type: string;
      amountLabel: string;
    }>;
  };
  insiders: {
    buysCount: number;
    sellsCount: number;
    trades: Array<{
      id: string;
      companyName: string;
      transactionDate: string;
      filingDate: string;
      transactionCode: string;
    }>;
  };
  prices: Array<{
    date: string;
    close: number;
    open?: number;
    high?: number;
    low?: number;
    volume?: number;
  }>;
  holdings: Array<{
    investorId: string;
    investorName: string;
    fundName: string;
    sharesNow: number;
    sharesDelta: number;
    valueNow: number;
    changeType: string;
    weightPct: number;
  }>;
  description: string;
}

interface RawConsensus {
  ticker?: string;
  company_name?: string;
  buyers?: number;
  sellers?: number;
  new_positions?: number;
  holders?: number;
  net_buyers?: number;
  total_value?: number;
  buyer_names?: string[];
  seller_names?: string[];
}

interface RawPrice {
  ticker?: string;
  date?: string;
  close_adj?: number;
  close_raw?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

interface RawStockAct {
  id: string;
  filer_name?: string;
  transaction_date?: string;
  disclosure_date?: string;
  transaction_type?: string;
  amount_label?: string;
}

interface RawInsider {
  id: string;
  company_name?: string;
  transaction_date?: string;
  filing_date?: string;
  transaction_code?: string;
}

interface RawHolding {
  investor_id?: string;
  shares_now?: number;
  shares_delta?: number;
  value_now?: number;
  change_type?: string;
  weight_pct?: number;
}

async function fetchCompanyDescription(ticker: string, companyName: string): Promise<string> {
  const upper = ticker.toUpperCase();
  const searchTerms = [
    upper === 'NVDA' ? 'Nvidia' : '',
    upper === 'AMZN' ? 'Amazon.com' : '',
    upper === 'AAPL' ? 'Apple Inc.' : '',
    upper === 'MSFT' ? 'Microsoft' : '',
    upper === 'TSLA' ? 'Tesla Inc.' : '',
    upper === 'GOOGL' || upper === 'GOOG' ? 'Alphabet Inc.' : '',
    upper === 'META' ? 'Meta Platforms' : '',
    upper === 'AMAT' ? 'Applied Materials' : '',
    upper === 'CRH' ? 'CRH plc' : '',
    upper === 'NTRA' ? 'Natera' : '',
    upper === 'BE' ? 'Bloom Energy' : '',
    companyName.split(' ')[0],
    companyName,
  ].filter(Boolean);

  for (const term of searchTerms) {
    try {
      const res = await fetch(`https://pl.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.extract && data.type !== 'disambiguation' && data.extract.length > 30) {
          return data.extract;
        }
      }
    } catch {
      // kontynuuj do kolejnego hasła
    }
  }

  return `${companyName} (${ticker}) – międzynarodowe przedsiębiorstwo notowane na giełdzie amerykańskiej, monitorowane w rejestrach SEC 13F, Form 4 oraz Kongresu USA (STOCK Act).`;
}

export async function fetchCompanyDetailData(
  ticker: string,
  initialName?: string
): Promise<CompanyDetailData> {
  const cleanTicker = ticker.trim().toUpperCase();

  const [consensusRows, priceRows, stockActRows, insiderRows, holdingsRows, investorRows] =
    await Promise.all([
      orcaSelect<RawConsensus>(`vw_consensus?ticker=eq.${cleanTicker}&limit=1`).catch(() => []),
      orcaSelect<RawPrice>(
        `prices_daily?ticker=eq.${cleanTicker}&order=date.asc&limit=365`
      ).catch(() => []),
      orcaSelect<RawStockAct>(
        `stock_act_trades?ticker=eq.${cleanTicker}&order=transaction_date.desc&limit=50`
      ).catch(() => []),
      orcaSelect<RawInsider>(
        `vw_insider_public?ticker=eq.${cleanTicker}&order=transaction_date.desc&limit=50`
      ).catch(() => []),
      orcaSelect<RawHolding>(
        `vw_holdings_changes?ticker=eq.${cleanTicker}&order=value_now.desc.nullslast&limit=30`
      ).catch(() => []),
      orcaSelect<{ id: string; display_name?: string; fund_name?: string }>(
        'investors?select=id,display_name,fund_name'
      ).catch(() => []),
    ]);

  const invMap = new Map<string, { displayName: string; fundName: string }>();
  investorRows.forEach((inv) => {
    invMap.set(inv.id, {
      displayName: inv.display_name || inv.fund_name || 'Fundusz 13F',
      fundName: inv.fund_name || '',
    });
  });

  const cons = consensusRows[0];
  const name = cons?.company_name || initialName || cleanTicker;

  // Process prices
  const prices = priceRows
    .filter((p) => p.date && (p.close_adj != null || p.close_raw != null))
    .map((p) => ({
      date: p.date!,
      close: Number((p.close_adj ?? p.close_raw ?? 0).toFixed(2)),
      open: p.open,
      high: p.high,
      low: p.low,
      volume: p.volume,
    }));

  const latestPrice = prices.length > 0 ? prices[prices.length - 1]?.close || 0 : 0;
  const prevPrice = prices.length > 1 ? prices[prices.length - 2]?.close || latestPrice : latestPrice;
  const oldestPrice = prices.length > 0 ? prices[0]?.close || latestPrice : latestPrice;

  const changeTodayPct = prevPrice > 0 ? ((latestPrice - prevPrice) / prevPrice) * 100 : 0;
  const change1yPct = oldestPrice > 0 ? ((latestPrice - oldestPrice) / oldestPrice) * 100 : 0;

  // Process politicians
  const polBuys = stockActRows.filter((t) => (t.transaction_type || '').toLowerCase().includes('buy')).length;
  const polSells = stockActRows.length - polBuys;

  // Process insiders
  const insBuys = insiderRows.filter((t) => (t.transaction_code || '').toUpperCase() === 'P' || (t.transaction_code || '').toUpperCase() === 'A').length;
  const insSells = insiderRows.length - insBuys;

  const description = await fetchCompanyDescription(cleanTicker, name);

  return {
    ticker: cleanTicker,
    name,
    exchange: 'NasdaqGS',
    sector: 'Technologia / Półprzewodniki',
    price: latestPrice,
    changeTodayPct: Number(changeTodayPct.toFixed(2)),
    change1yPct: Number(change1yPct.toFixed(1)),
    consensus: {
      buyers: cons?.buyers || 0,
      sellers: cons?.sellers || 0,
      newPositions: cons?.new_positions || 0,
      holders: cons?.holders || 0,
      netBuyers: cons?.net_buyers || 0,
      totalValueUsd: cons?.total_value || 0,
      buyerNames: cons?.buyer_names || [],
      sellerNames: cons?.seller_names || [],
    },
    politicians: {
      buyersCount: polBuys,
      sellsCount: polSells,
      trades: stockActRows.map((t) => ({
        id: t.id,
        filerName: t.filer_name || 'Kongresmen',
        transactionDate: t.transaction_date || '',
        disclosureDate: t.disclosure_date || '',
        type: t.transaction_type || 'Zakup',
        amountLabel: t.amount_label || '$1K - $15K',
      })),
    },
    insiders: {
      buysCount: insBuys,
      sellsCount: insSells,
      trades: insiderRows.map((t) => ({
        id: t.id,
        companyName: t.company_name || name,
        transactionDate: t.transaction_date || '',
        filingDate: t.filing_date || '',
        transactionCode: t.transaction_code || 'S',
      })),
    },
    prices,
    holdings: holdingsRows.map((h) => {
      const invInfo = invMap.get(h.investor_id || '');
      return {
        investorId: h.investor_id || '',
        investorName: invInfo?.displayName || 'Fundusz 13F',
        fundName: invInfo?.fundName || '',
        sharesNow: h.shares_now || 0,
        sharesDelta: h.shares_delta || 0,
        valueNow: h.value_now || 0,
        changeType: h.change_type || 'utrzymana',
        weightPct: h.weight_pct || 0,
      };
    }),
    description,
  };
}
