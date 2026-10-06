/**
 * companyDetailService.ts — Pobieranie pełnych danych spółki dla widoku CompanyDetailView.
 * Pobiera konsensus 13F, notowania daily, transakcje Kongresu, transakcje insiderów
 * oraz opis z polskiej Wikipedii.
 */

import { orcaSelect } from './superinvestorsApi';
import { getTodayWarsaw, shiftDateStr } from '../date';
import { summarizeCompanyPrices, type CompanyPriceRow } from './companyPriceHistory';

export interface CompanyDetailData {
  fundHistory: CompanyFundHistoryPoint[];
  fundChanges: { period: string; previousPeriod: string; comparedFunds: number; increases: number; decreases: number; newReported: number } | null;
  market: 'us' | 'gpw';
  ticker: string;
  name: string;
  exchange: string;
  sector: string;
  price: number | null;
  priceCurrency: string | null;
  priceDate: string | null;
  priceSourceUrl: string | null;
  changeTodayPct: number | null;
  change1yPct: number | null;
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
    sharesDelta: number | null;
    valueNow: number;
    changeType: string;
    period: string;
    previousPeriod: string | null;
    sourceUrls: string[];
  }>;
  description: string;
}

export interface CompanyFundHistoryPoint {
  period_of_report: string;
  reported_holders: number;
  reported_shares: number;
  reported_value_usd: number;
  latest_filing_date: string;
  source_urls: string[];
  summary_warnings?: Array<{ source_url: string; reported_total_usd: number; computed_total_usd: number; difference_usd: number }>;
}

interface RawConsensus {
  company_name?: string;
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
  investor_id: string;
  shares: number;
  value_usd: number;
  period_of_report: string;
  filing_url: string;
}

interface RawHoldingChange {
  investor_id: string;
  shares_now: number;
  shares_delta: number;
  value_now: number;
  change_type: string;
  period_of_report: string;
  previous_period: string;
  filing_url: string;
  previous_filing_url: string;
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
    companyName,
  ].filter(Boolean);

  for (const term of searchTerms) {
    try {
      const res = await fetch(`https://pl.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`, { signal: AbortSignal.timeout(5000) });
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

  return `Brak zweryfikowanego opisu spółki ${companyName} (${ticker}).`;
}

export async function fetchCompanyDetailData(
  ticker: string,
  initialName?: string,
  market: 'us' | 'gpw' = 'us',
): Promise<CompanyDetailData> {
  const cleanTicker = ticker.trim().toUpperCase();
  const priceSymbol = market === 'gpw' ? `${cleanTicker.replace(/\.(PL|WA)$/, '')}.WA` : cleanTicker;
  const today = getTodayWarsaw();

  const [consensusRows, priceRows, stockActRows, insiderRows, holdingsRows, changeRows, investorRows, fundHistory] =
    await Promise.all([
      market === 'us' ? orcaSelect<RawConsensus>(`vw_consensus?select=company_name&ticker=eq.${encodeURIComponent(cleanTicker)}&limit=1`, { strict: true }) : Promise.resolve([]),
      orcaSelect<CompanyPriceRow>(
        `prices_daily?ticker=eq.${encodeURIComponent(priceSymbol)}&date=gte.${shiftDateStr(today, -375)}&date=lte.${today}&order=date.asc&limit=400`,
        { strict: true },
      ),
      market === 'us' ? orcaSelect<RawStockAct>(
        `stock_act_trades?ticker=eq.${cleanTicker}&source_url=not.is.null&disclosure_date=not.is.null&order=transaction_date.desc&limit=50`,
        { strict: true },
      ) : Promise.resolve([]),
      market === 'us' ? orcaSelect<RawInsider>(
        `vw_sec_form4_public?ticker=eq.${cleanTicker}&is_derivative=eq.false&form_type=eq.4&order=transaction_date.desc&limit=50`,
        { strict: true },
      ) : Promise.resolve([]),
      market === 'us' ? orcaSelect<RawHolding>(
        `vw_sec13f_current_holdings?ticker=eq.${encodeURIComponent(cleanTicker)}&order=value_usd.desc&limit=200`,
        { strict: true },
      ) : Promise.resolve([]),
      market === 'us' ? orcaSelect<RawHoldingChange>(
        `vw_sec13f_verified_changes?ticker=eq.${encodeURIComponent(cleanTicker)}&order=value_now.desc&limit=200`,
        { strict: true },
      ) : Promise.resolve([]),
      market === 'us' ? orcaSelect<{ id: string; display_name?: string; fund_name?: string }>(
        'investors?select=id,display_name,fund_name',
        { strict: true },
      ) : Promise.resolve([]),
      market === 'us' ? orcaSelect<CompanyFundHistoryPoint>(
        `vw_sec13f_company_history?ticker=eq.${encodeURIComponent(cleanTicker)}&order=period_of_report.desc&limit=40`,
        { strict: true },
      ) : Promise.resolve([]),
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

  const priceSummary = summarizeCompanyPrices(priceRows, today);

  // Process politicians
  const polBuys = stockActRows.filter((t) => /buy|purchase/i.test(t.transaction_type || '')).length;
  const polSells = stockActRows.filter((t) => /sell|sale/i.test(t.transaction_type || '')).length;

  // Process insiders
  const insBuys = insiderRows.filter((t) => t.transaction_code === 'P').length;
  const insSells = insiderRows.filter((t) => t.transaction_code === 'S').length;

  const description = await fetchCompanyDescription(cleanTicker, name);
  const changes = new Map(changeRows.map(row => [row.investor_id, row]));
  const holdings = new Map(holdingsRows.map(row => [row.investor_id, row]));
  const fundChanges = changeRows.length ? {
    period: changeRows[0].period_of_report, previousPeriod: changeRows[0].previous_period,
    comparedFunds: changeRows.length,
    increases: changeRows.filter(row => row.shares_delta > 0).length,
    decreases: changeRows.filter(row => row.shares_delta < 0).length,
    newReported: changeRows.filter(row => row.change_type === 'reported_new').length,
  } : null;

  return {
    fundHistory,
    fundChanges,
    market,
    ticker: cleanTicker,
    name,
    exchange: market === 'gpw' ? 'GPW' : '—',
    sector: '—',
    ...priceSummary,
    politicians: {
      buyersCount: polBuys,
      sellsCount: polSells,
      trades: stockActRows.map((t) => ({
        id: t.id,
        filerName: t.filer_name || 'Kongresmen',
        transactionDate: t.transaction_date || '',
        disclosureDate: t.disclosure_date || '',
        type: t.transaction_type || 'Nieznany typ',
        amountLabel: t.amount_label || '—',
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
        transactionCode: t.transaction_code || '—',
      })),
    },
    holdings: [...new Set([...holdings.keys(), ...changes.keys()])].map((investorId) => {
      const h = holdings.get(investorId);
      const change = changes.get(investorId);
      const invInfo = invMap.get(investorId);
      return {
        investorId,
        investorName: invInfo?.displayName || 'Fundusz 13F',
        fundName: invInfo?.fundName || '',
        sharesNow: h?.shares ?? change!.shares_now,
        sharesDelta: change?.shares_delta ?? null,
        valueNow: h?.value_usd ?? change!.value_now,
        changeType: change?.change_type ?? 'uncompared',
        period: h?.period_of_report ?? change!.period_of_report,
        previousPeriod: change?.previous_period ?? null,
        sourceUrls: change ? [change.filing_url, change.previous_filing_url] : [h!.filing_url],
      };
    }),
    description,
  };
}
